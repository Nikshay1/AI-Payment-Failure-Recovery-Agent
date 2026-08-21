"use client";

import { useEffect, useMemo, useState } from "react";
import { CASE_LABELS, type DashboardState, money, relativeTime, type RecoveryCase } from "@/lib/recovery";
import "./recovery-console.css";

const sessionStorageKey = "recoverflow-demo-session";

function demoSession() {
  if (typeof window === "undefined") return "recoverflow_demo";
  const existing = window.localStorage.getItem(sessionStorageKey);
  if (existing) return existing;
  const next = `demo_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
  window.localStorage.setItem(sessionStorageKey, next);
  return next;
}

const nav = ["Recovery desk", "Failure weather", "Playbooks", "Audit log"];

function statusClass(status: RecoveryCase["status"]) { return `status status-${status}`; }
function caseKind(id: string, kind: string) { return id.endsWith(`--${kind}`); }

export function RecoveryConsole() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("System ready — simulator data is isolated to this browser.");
  const current = useMemo(() => data?.cases.find((item) => item.id === selected) ?? data?.cases[0], [data, selected]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/recovery?session=${demoSession()}`)
      .then((response) => response.ok ? response.json() as Promise<DashboardState> : null)
      .then((next) => { if (!cancelled && next) setData(next); });
    return () => { cancelled = true; };
  }, []);

  async function act(action: "reset" | "execute" | "recover" | "replay" | "risk" | "analyze") {
    setBusy(action);
    try {
      const response = await fetch("/api/recovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: demoSession(), action }) });
      if (!response.ok) throw new Error("The recovery engine was unavailable.");
      const next = await response.json() as DashboardState;
      setData(next);
      const messages: Record<typeof action, string> = {
        reset: "Demo reset to its starting recovery queue.",
        execute: "One recovery link is now in the simulated customer inbox.",
        recover: "Payment captured. Pending recovery work was cancelled.",
        replay: "Duplicate webhook safely ignored — no second message was created.",
        risk: "Safety gate confirmed: customer messaging remains blocked.",
        analyze: next.aiMode === "live" ? "Groq proposal validated and applied." : "Safe deterministic plan applied. Add GROQ_API_KEY for live analysis.",
      };
      setNotice(messages[action]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong.");
    } finally { setBusy(null); }
  }

  if (!data || !current) return <main className="loading-shell"><span className="pulse" /> Preparing recovery desk…</main>;

  const message = data.inbox.find((item) => caseKind(item.caseId, "upi"));
  return (
    <main className="app-shell">
      <aside className="side-rail">
        <div className="brand"><span className="brand-mark">R</span><span>recover<span>flow</span></span></div>
        <div className="rail-label">Control plane</div>
        <nav aria-label="Application navigation">
          {nav.map((item, index) => <button className={index === 0 ? "nav-item nav-active" : "nav-item"} key={item} type="button"><span>{["◉", "⌁", "◫", "◌"][index]}</span>{item}</button>)}
        </nav>
        <div className="rail-foot"><div className="demo-dot" /> Synthetic demo<br /><span>Groq-safe · zero-cost</span></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">Friday, 21 Aug · Payments operations</p><h1>Make the next best recovery move.</h1></div>
          <div className="top-actions"><span className={`model-state model-${data.aiMode}`}>{data.aiMode === "live" ? "✦ Groq live" : data.aiMode === "cached" ? "✦ cached plan" : "◌ safe fallback"}</span><button className="ghost-button" onClick={() => void act("reset")} type="button">Reset demo</button><button className="primary-button" onClick={() => void act("analyze")} disabled={busy !== null} type="button">{busy === "analyze" ? "Thinking safely…" : "Run AI analysis"}</button></div>
        </header>

        <div className="notice" role="status"><span>✦</span>{notice}</div>

        <section className="metrics" aria-label="Recovery metrics">
          <Metric label="At-risk value" value={money(data.atRisk)} note="3 recoverable cases" accent="blue" />
          <Metric label="Recovered today" value={money(data.recovered)} note="1 completed journey" accent="mint" />
          <Metric label="Recovery rate" value={`${data.recoveryRate}%`} note="synthetic baseline" accent="amber" />
          <Metric label="Active incidents" value={`${data.incidentCount}`} note="UPI issuer cluster" accent="red" />
        </section>

        <section className="hero-grid">
          <article className="incident-card">
            <div className="section-heading"><div><p className="eyebrow">Failure weather</p><h2>UPI issuer friction is rising</h2></div><span className="incident-live"><i /> Live signal</span></div>
            <div className="weather-line" role="img" aria-label="Six related UPI issuer failures detected over ten minutes"><div className="weather-labels"><span>12:20</span><span>12:24</span><span>12:28</span><span>now</span></div><div className="weather-bars">{[12, 19, 15, 31, 49, 78, 63, 89, 72, 96].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div></div>
            <div className="weather-summary"><div><strong>6 failures</strong><span>same bank / rail</span></div><div><strong>+34%</strong><span>vs. baseline</span></div><div><strong>15 min</strong><span>safe wait window</span></div></div>
            <div className="signal-note"><span>⌁</span>Provider pattern says “route around”, not “try the same thing again”.</div>
          </article>

          <article className="decision-card">
            <div className="section-heading"><div><p className="eyebrow">Priority case</p><h2>{current.customer}</h2></div><span className={statusClass(current.status)}>{CASE_LABELS[current.status]}</span></div>
            <div className="case-meta"><span>{money(current.amount)}</span><i /> <span>{current.method}</span><i /> <span>{current.rail}</span></div>
            <div className="score-row"><div><span>Recovery opportunity</span><strong>{current.score}<small>/100</small></strong></div><div className="score-track"><span style={{ width: `${current.score}%` }} /></div></div>
            <p className="case-detail">{current.detail}</p>
            <div className="decision-trace"><Trace step="01" label="Facts" value={current.reason} /><Trace step="02" label="Policy" value="Same-rail retry blocked" /><Trace step="03" label="Plan" value={current.proposedAction} /></div>
            <div className="button-row"><button className="primary-button" onClick={() => void act("execute")} disabled={busy !== null || current.status === "recovered" || current.status === "manual_review"} type="button">{busy === "execute" ? "Creating…" : current.status === "awaiting_customer" ? "Link sent to inbox" : "Execute safe recovery"}</button><button className="ghost-button" onClick={() => void act("replay")} disabled={busy !== null} type="button">Replay duplicate</button></div>
          </article>
        </section>

        <section className="lower-grid">
          <article className="queue-card">
            <div className="section-heading"><div><p className="eyebrow">Recovery queue</p><h2>Actionable, not noisy</h2></div><span className="small-muted">{data.cases.length} cases</span></div>
            <div className="queue-list">{data.cases.map((item) => <button className={item.id === current.id ? "queue-item selected" : "queue-item"} onClick={() => setSelected(item.id)} key={item.id} type="button"><span className={`method-icon method-${item.method.toLowerCase()}`}>{item.method === "UPI" ? "₹" : "▣"}</span><span className="queue-copy"><strong>{item.customer}</strong><small>{item.category} · {item.reason}</small></span><span className="queue-value"><strong>{money(item.amount)}</strong><small>{item.score ? `${item.score} score` : "blocked"}</small></span><span className={statusClass(item.status)}>{CASE_LABELS[item.status]}</span></button>)}</div>
          </article>

          <article className="journey-card">
            <div className="section-heading"><div><p className="eyebrow">Customer journey twin</p><h2>Inbox → recovery → receipt</h2></div><span className="small-muted">simulated</span></div>
            <div className="phone"><div className="phone-top"><span>9:41</span><b>Customer inbox</b><span>●●●</span></div>{message ? <div className="message-card"><span className="message-avatar">R</span><div><small>recoverflow payments · now</small><strong>{message.subject}</strong><p>{message.body}</p><button onClick={() => void act("recover")} disabled={busy !== null || current.status === "recovered"} type="button">{current.status === "recovered" ? "Payment completed" : "Choose another method →"}</button></div></div> : <div className="empty-inbox"><span>✉</span><strong>Nothing sent yet</strong><p>Execute the safe recovery plan to create one short-lived customer link.</p></div>}<div className="phone-footer">No real email, SMS, or payment is sent.</div></div>
            <div className="safety-callout"><span>◌</span><div><strong>Safety gate active</strong><p>High-risk cases cannot create a customer message.</p></div><button onClick={() => void act("risk")} type="button">Test gate</button></div>
          </article>
        </section>

        <section className="audit-card"><div className="section-heading"><div><p className="eyebrow">Decision ledger</p><h2>Every action has a reason</h2></div><span className="small-muted">latest {data.audit.length} events</span></div><div className="audit-list">{data.audit.slice(0, 5).map((event) => <div className="audit-row" key={event.id}><span className={`audit-icon audit-${event.actor}`}>{event.actor === "agent" ? "✦" : event.actor === "customer" ? "✓" : "◌"}</span><div><strong>{event.kind.replaceAll("_", " ")}</strong><p>{event.message}</p></div><time>{relativeTime(event.createdAt)}</time></div>)}</div></section>
      </section>
    </main>
  );
}

function Metric({ label, value, note, accent }: { label: string; value: string; note: string; accent: string }) { return <article className={`metric metric-${accent}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
function Trace({ step, label, value }: { step: string; label: string; value: string }) { return <div><span>{step}</span><small>{label}</small><strong>{value}</strong></div>; }
