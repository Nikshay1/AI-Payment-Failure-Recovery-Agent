export type CaseStatus =
  | "ready"
  | "awaiting_customer"
  | "recovered"
  | "manual_review"
  | "scheduled";

export type AiMode = "live" | "fallback" | "cached" | "disabled";

export type RecoveryCase = {
  id: string;
  customer: string;
  amount: number;
  method: string;
  rail: string;
  category: string;
  reason: string;
  status: CaseStatus;
  score: number;
  proposedAction: string;
  detail: string;
  plan: string;
  aiMode: AiMode;
  updatedAt: string;
};

export type AuditEvent = {
  id: string;
  caseId: string;
  kind: string;
  message: string;
  actor: "system" | "agent" | "customer" | "operator";
  createdAt: string;
};

export type InboxMessage = {
  id: string;
  caseId: string;
  subject: string;
  body: string;
  status: "draft" | "sent" | "opened" | "completed";
  createdAt: string;
};

export type DashboardState = {
  sessionId: string;
  aiMode: AiMode;
  aiConfigured: boolean;
  atRisk: number;
  recovered: number;
  recoveryRate: number;
  incidentCount: number;
  cases: RecoveryCase[];
  audit: AuditEvent[];
  inbox: InboxMessage[];
};

export const CASE_LABELS: Record<CaseStatus, string> = {
  ready: "Recovery ready",
  awaiting_customer: "Awaiting customer",
  recovered: "Recovered",
  manual_review: "Manual review",
  scheduled: "Touch scheduled",
};

export function money(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function relativeTime(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
