import { env } from "cloudflare:workers";
import type { AiMode, AuditEvent, DashboardState, InboxMessage, RecoveryCase } from "@/lib/recovery";

type RuntimeEnv = { DB?: D1Database; GROQ_API_KEY?: string };
type CaseRow = {
  id: string; session_id: string; customer: string; amount: number; method: string; rail: string;
  category: string; reason: string; status: RecoveryCase["status"]; score: number; proposed_action: string;
  detail: string; plan: string; ai_mode: AiMode; updated_at: string;
};
type AuditRow = { id: string; case_id: string; kind: string; message: string; actor: AuditEvent["actor"]; created_at: string };
type InboxRow = { id: string; case_id: string; subject: string; body: string; status: InboxMessage["status"]; created_at: string };

let schemaReady: Promise<void> | undefined;

function database() {
  const db = (env as unknown as RuntimeEnv).DB;
  if (!db) throw new Error("D1 storage is unavailable.");
  return db;
}

export function groqKey() {
  return (env as unknown as RuntimeEnv).GROQ_API_KEY;
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

function caseId(sessionId: string, slug: string) {
  return `${sessionId}--${slug}`;
}

async function ensureSchema() {
  if (!schemaReady) {
    const db = database();
    schemaReady = db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS recovery_cases (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL, customer TEXT NOT NULL, amount INTEGER NOT NULL,
        method TEXT NOT NULL, rail TEXT NOT NULL, category TEXT NOT NULL, reason TEXT NOT NULL,
        status TEXT NOT NULL, score INTEGER NOT NULL, proposed_action TEXT NOT NULL, detail TEXT NOT NULL,
        plan TEXT NOT NULL, ai_mode TEXT NOT NULL, updated_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS recovery_audit (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL, case_id TEXT NOT NULL, kind TEXT NOT NULL,
        message TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS recovery_inbox (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL, case_id TEXT NOT NULL, subject TEXT NOT NULL,
        body TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_cases_session_updated ON recovery_cases(session_id, updated_at DESC)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_audit_session_created ON recovery_audit(session_id, created_at DESC)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_inbox_session_created ON recovery_inbox(session_id, created_at DESC)"),
    ]).then(() => undefined);
  }
  await schemaReady;
}

async function writeAudit(sessionId: string, caseId: string, kind: string, message: string, actor: AuditEvent["actor"]) {
  const db = database();
  await db.prepare("INSERT INTO recovery_audit (id, session_id, case_id, kind, message, actor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id("evt"), sessionId, caseId, kind, message, actor, new Date().toISOString()).run();
}

async function seed(sessionId: string) {
  await ensureSchema();
  const db = database();
  const existing = await db.prepare("SELECT id FROM recovery_cases WHERE session_id = ? LIMIT 1").bind(sessionId).first<{ id: string }>();
  if (existing?.id.includes("--")) return;
  if (existing) {
    await db.batch([
      db.prepare("DELETE FROM recovery_inbox WHERE session_id = ?").bind(sessionId),
      db.prepare("DELETE FROM recovery_audit WHERE session_id = ?").bind(sessionId),
      db.prepare("DELETE FROM recovery_cases WHERE session_id = ?").bind(sessionId),
    ]);
  }
  const now = new Date().toISOString();
  const ids = {
    upi: caseId(sessionId, "upi"),
    card: caseId(sessionId, "card"),
    otp: caseId(sessionId, "otp"),
    risk: caseId(sessionId, "risk"),
  };
  const rows: Array<Omit<CaseRow, "session_id">> = [
    { id: ids.upi, customer: "Aarav Mehta", amount: 4999, method: "UPI", rail: "HDFC • PSP", category: "Transient issuer", reason: "Bank-side availability issue", status: "ready", score: 87, proposed_action: "Wait 15m · offer card", detail: "6 similar UPI failures in the last 10 minutes. This is likely external, not customer-caused.", plan: "Pause the same rail, then invite a switch to card or netbanking. One gentle touch only.", ai_mode: "fallback", updated_at: now },
    { id: ids.card, customer: "Nisha Rao", amount: 1299, method: "Card", rail: "Visa • HDFC", category: "Funding", reason: "Insufficient funds", status: "scheduled", score: 71, proposed_action: "Offer alternate method", detail: "Returning customer with 14 successful payments. Avoid an immediate same-card retry.", plan: "Send a payment-method choice at 18:30 IST. Do not retry the original card.", ai_mode: "fallback", updated_at: new Date(Date.now() - 11 * 60_000).toISOString() },
    { id: ids.otp, customer: "Kavya Iyer", amount: 799, method: "UPI", rail: "PhonePe", category: "Customer auth", reason: "OTP not completed", status: "recovered", score: 78, proposed_action: "Reopen checkout", detail: "Customer completed a fresh checkout after a concise authentication reminder.", plan: "Recovered without another contact.", ai_mode: "cached", updated_at: new Date(Date.now() - 24 * 60_000).toISOString() },
    { id: ids.risk, customer: "Rohan Shah", amount: 18200, method: "Card", rail: "Mastercard", category: "Risk / compliance", reason: "Manual review required", status: "manual_review", score: 0, proposed_action: "Suppress automation", detail: "Safety gate blocked customer contact until a reviewer resolves the missing evidence.", plan: "No payment link or message may be created.", ai_mode: "disabled", updated_at: new Date(Date.now() - 38 * 60_000).toISOString() },
  ];
  await db.batch(rows.map((row) => db.prepare(`INSERT INTO recovery_cases (
      id, session_id, customer, amount, method, rail, category, reason, status, score,
      proposed_action, detail, plan, ai_mode, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(row.id, sessionId, row.customer, row.amount, row.method, row.rail, row.category, row.reason, row.status, row.score, row.proposed_action, row.detail, row.plan, row.ai_mode, row.updated_at)));
  await Promise.all([
    writeAudit(sessionId, ids.upi, "cluster_detected", "Failure weather detected: 6 related UPI issuer failures.", "system"),
    writeAudit(sessionId, ids.upi, "policy_ready", "Recovery ready. Same-rail retry suppressed; alternate methods are allowed.", "system"),
    writeAudit(sessionId, ids.risk, "safety_gate", "Automation suppressed: manual review is required for this risk case.", "system"),
  ]);
}

function mapCase(row: CaseRow): RecoveryCase {
  return { id: row.id, customer: row.customer, amount: row.amount, method: row.method, rail: row.rail, category: row.category, reason: row.reason, status: row.status, score: row.score, proposedAction: row.proposed_action, detail: row.detail, plan: row.plan, aiMode: row.ai_mode, updatedAt: row.updated_at };
}

export async function dashboard(sessionId: string): Promise<DashboardState> {
  await seed(sessionId);
  const db = database();
  const [caseResult, auditResult, inboxResult] = await Promise.all([
    db.prepare("SELECT * FROM recovery_cases WHERE session_id = ? ORDER BY CASE status WHEN 'ready' THEN 0 WHEN 'awaiting_customer' THEN 1 WHEN 'scheduled' THEN 2 ELSE 3 END, updated_at DESC").bind(sessionId).all<CaseRow>(),
    db.prepare("SELECT id, case_id, kind, message, actor, created_at FROM recovery_audit WHERE session_id = ? ORDER BY created_at DESC LIMIT 12").bind(sessionId).all<AuditRow>(),
    db.prepare("SELECT id, case_id, subject, body, status, created_at FROM recovery_inbox WHERE session_id = ? ORDER BY created_at DESC LIMIT 4").bind(sessionId).all<InboxRow>(),
  ]);
  const cases = caseResult.results.map(mapCase);
  const atRisk = cases.filter((item) => item.status !== "recovered").reduce((sum, item) => sum + item.amount, 0);
  const recovered = cases.filter((item) => item.status === "recovered").reduce((sum, item) => sum + item.amount, 0);
  return {
    sessionId,
    aiMode: cases.find((item) => item.id === caseId(sessionId, "upi"))?.aiMode ?? "fallback",
    aiConfigured: Boolean(groqKey()),
    atRisk,
    recovered,
    recoveryRate: Math.round((cases.filter((item) => item.status === "recovered").length / cases.length) * 100),
    incidentCount: 1,
    cases,
    audit: auditResult.results.map((row) => ({ id: row.id, caseId: row.case_id, kind: row.kind, message: row.message, actor: row.actor, createdAt: row.created_at })),
    inbox: inboxResult.results.map((row) => ({ id: row.id, caseId: row.case_id, subject: row.subject, body: row.body, status: row.status, createdAt: row.created_at })),
  };
}

async function updateCase(sessionId: string, caseId: string, values: Partial<Pick<CaseRow, "status" | "ai_mode" | "plan" | "proposed_action" | "detail" | "score">>) {
  const db = database();
  const fields = Object.entries(values).map(([key]) => `${key} = ?`).join(", ");
  const args = [...Object.values(values), new Date().toISOString(), caseId, sessionId];
  await db.prepare(`UPDATE recovery_cases SET ${fields}, updated_at = ? WHERE id = ? AND session_id = ?`).bind(...args).run();
}

export async function executeAction(sessionId: string, action: string) {
  await seed(sessionId);
  if (action === "reset") {
    const db = database();
    await db.batch([
      db.prepare("DELETE FROM recovery_inbox WHERE session_id = ?").bind(sessionId),
      db.prepare("DELETE FROM recovery_audit WHERE session_id = ?").bind(sessionId),
      db.prepare("DELETE FROM recovery_cases WHERE session_id = ?").bind(sessionId),
    ]);
    await seed(sessionId);
    return dashboard(sessionId);
  }
  if (action === "execute") {
    const upi = caseId(sessionId, "upi");
    await updateCase(sessionId, upi, { status: "awaiting_customer", proposed_action: "Recovery link sent", plan: "Customer can choose card or netbanking. The original UPI rail remains paused." });
    const db = database();
    await db.prepare("INSERT INTO recovery_inbox (id, session_id, case_id, subject, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(id("msg"), sessionId, upi, "A smoother way to complete your payment", "Your UPI attempt did not go through because of a temporary issue. Choose another secure payment method to finish your order.", "sent", new Date().toISOString()).run();
    await writeAudit(sessionId, upi, "message_sent", "Demo inbox message and one short-lived recovery link were created.", "agent");
  }
  if (action === "recover") {
    const upi = caseId(sessionId, "upi");
    await updateCase(sessionId, upi, { status: "recovered", proposed_action: "Recovered via card", plan: "Customer completed a new checkout with card. Pending recovery work was cancelled." });
    const db = database();
    await db.prepare("UPDATE recovery_inbox SET status = 'completed' WHERE session_id = ? AND case_id = ?").bind(sessionId, upi).run();
    await writeAudit(sessionId, upi, "payment_captured", "Recovered: alternate-card payment captured. All pending touches cancelled.", "customer");
  }
  if (action === "replay") {
    await writeAudit(sessionId, caseId(sessionId, "upi"), "duplicate_ignored", "Duplicate payment.failed event ignored by idempotency key evt_demo_upi_01.", "system");
  }
  if (action === "risk") {
    await writeAudit(sessionId, caseId(sessionId, "risk"), "safety_gate", "Manual review remains active. Customer messaging is blocked by policy.", "system");
  }
  return dashboard(sessionId);
}

export async function applyAnalysis(sessionId: string, proposal: { plan: string; action: string; detail: string; mode: AiMode }) {
  const upi = caseId(sessionId, "upi");
  await updateCase(sessionId, upi, { plan: proposal.plan, proposed_action: proposal.action, detail: proposal.detail, ai_mode: proposal.mode });
  await writeAudit(sessionId, upi, proposal.mode === "live" ? "groq_plan" : "fallback_plan", proposal.mode === "live" ? "Groq proposal validated against the recovery policy." : "Deterministic fallback plan applied; no live model response was used.", proposal.mode === "live" ? "agent" : "system");
  return dashboard(sessionId);
}
