"use client";

import { useEffect, useMemo, useState } from "react";
import { CASE_LABELS, type DashboardState, money, relativeTime, type RecoveryCase } from "@/lib/recovery";
import "./recovery-console.css";

const sessionStorageKey = "recoverflow-demo-session";
const nav = [
  { label: "Recovery desk", target: "recovery-desk" },
  { label: "Queue", target: "recovery-queue" },
  { label: "Customer link", target: "customer-link" },
  { label: "Activity", target: "activity" },
];

function demoSession() {
  if (typeof window === "undefined") return "recoverflow_demo";
  const existing = window.localStorage.getItem(sessionStorageKey);
  if (existing) return existing;
  const next = `demo_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
  window.localStorage.setItem(sessionStorageKey, next);
  return next;
}

function statusClass(status: RecoveryCase["status"]) { return `status status-${status}`; }
function caseKind(id: string, kind: string) { return id.endsWith(`--${kind}`); }

export function RecoveryConsole() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("Ready to review payment failures.");
  const [activeNav, setActiveNav] = useState("Recovery desk");
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
      if (!response.ok) throw new Error("The recovery engine is temporarily unavailable.");
      const next = await response.json() as DashboardState;
      setData(next);
      setNotice({
        reset: "Demo reset. The recovery queue is back at its starting state.",
        execute: "A single recovery link is ready in the simulated customer inbox.",
        recover: "Payment captured. Pending recovery work has been cancelled.",
        replay: "Duplicate event ignored. No second customer message was created.",
        risk: "Safety gate confirmed. Customer messaging remains blocked.",
        analyze: next.aiMode === "live" ? "Groq reviewed the case and the safe plan was applied." : `Deterministic safe plan applied. ${next.groqIssue ?? "Groq could not be reached for this run."}`,
      }[action]);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong."); }
    finally { setBusy(null); }
  }

  function goTo(item: (typeof nav)[number]) {
    setActiveNav(item.label);
    document.getElementById(item.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!data || !current) return <main className="loading-shell">Loading recovery desk…</main>;
  const message = data.inbox.find((item) => caseKind(item.caseId, "upi"));
  const highRisk = current.status === "manual_review";

  return <main className="app-shell">
    <aside className="side-rail">
      <a className="brand" href="#recovery-desk" onClick={(event) => { event.preventDefault(); goTo(nav[0]); }}>RecoverFlow</a>
      <nav aria-label="Application navigation">{nav.map((item) => <button className={activeNav === item.label ? "nav-item nav-active" : "nav-item"} key={item.target} onClick={() => goTo(item)} type="button">{item.label}</button>)}</nav>
      <p className="rail-note">Payment recovery<br />simulation</p>
    </aside>
    <section className="workspace" id="recovery-desk">
      <header className="topbar">
        <div><p className="kicker">Payments operations</p><h1>Recovery desk</h1><p className="subhead">Decide what happens next when a payment fails.</p></div>
        <div className="header-actions"><span className="model-state">{data.aiMode === "live" ? "Groq live" : data.aiConfigured ? "Groq key set" : "Safe fallback"}</span><button className="text-button" onClick={() => void act("reset")} type="button">Reset demo</button><button className="black-button" onClick={() => void act("analyze")} disabled={busy !== null} type="button">{busy === "analyze" ? "Reviewing…" : "Run AI analysis"}</button></div>
      </header>
      <div className="notice" role="status">{notice}</div>
      <dl className="summary" aria-label="Recovery summary"><div><dt>At risk</dt><dd>{money(data.atRisk)}</dd></div><div><dt>Recovered today</dt><dd>{money(data.recovered)}</dd></div><div><dt>Recovery rate</dt><dd>{data.recoveryRate}%</dd></div><div><dt>Open incidents</dt><dd>{data.incidentCount}</dd></div></dl>
      <section className="desk-grid">
        <section className="queue-panel" id="recovery-queue" aria-labelledby="queue-heading">
          <div className="section-bar"><div><p className="kicker">Needs attention</p><h2 id="queue-heading">Payment queue</h2></div><span>{data.cases.length} cases</span></div>
          <div className="queue-table" role="table" aria-label="Payment recovery queue"><div className="queue-head" role="row"><span>Customer</span><span>Payment</span><span>Reason</span><span>Status</span></div>{data.cases.map((item) => <button className={item.id === current.id ? "queue-row selected" : "queue-row"} onClick={() => setSelected(item.id)} key={item.id} type="button" role="row"><span><strong>{item.customer}</strong><small>{item.method} · {item.rail}</small></span><span><strong>{money(item.amount)}</strong><small>{item.score ? `${item.score}/100 opportunity` : "review required"}</small></span><span className="reason">{item.reason}</span><span className={statusClass(item.status)}>{CASE_LABELS[item.status]}</span></button>)}</div>
        </section>
        <aside className="detail-panel" aria-labelledby="detail-heading">
          <div className="section-bar"><div><p className="kicker">Selected payment</p><h2 id="detail-heading">{current.customer}</h2></div><span className={statusClass(current.status)}>{CASE_LABELS[current.status]}</span></div>
          <div className="payment-facts"><div><span>Amount</span><strong>{money(current.amount)}</strong></div><div><span>Method</span><strong>{current.method} · {current.rail}</strong></div></div><p className="detail-copy">{current.detail}</p>
          <div className="decision"><p className="kicker">Recommended next step</p><strong>{current.proposedAction}</strong><p>{current.plan}</p></div>
          <div className="detail-actions"><button className="black-button" onClick={() => void act("execute")} disabled={busy !== null || current.status === "recovered" || highRisk} type="button">{busy === "execute" ? "Creating link…" : current.status === "awaiting_customer" ? "Link already sent" : "Create recovery link"}</button><button className="text-button" onClick={() => void act("replay")} disabled={busy !== null} type="button">Test duplicate event</button></div>{highRisk && <p className="blocked-note">Messaging is unavailable until this payment is reviewed.</p>}
        </aside>
      </section>
      <section className="lower-grid">
        <section className="journey-panel" id="customer-link" aria-labelledby="journey-heading"><div className="section-bar"><div><p className="kicker">Customer link</p><h2 id="journey-heading">Recovery journey</h2></div><span>Simulated</span></div>{message ? <div className="message"><p><strong>{message.subject}</strong><br />{message.body}</p><button className="black-button" onClick={() => void act("recover")} disabled={busy !== null || current.status === "recovered"} type="button">{current.status === "recovered" ? "Payment completed" : "Choose another method"}</button></div> : <div className="empty-state"><strong>No message sent</strong><p>Create one recovery link only after reviewing the selected payment.</p></div>}<div className="panel-foot">No real email, SMS, or payment is sent.</div></section>
        <section className="activity-panel" id="activity" aria-labelledby="activity-heading"><div className="section-bar"><div><p className="kicker">Decision record</p><h2 id="activity-heading">Activity</h2></div><button className="text-button" onClick={() => void act("risk")} type="button">Test safety gate</button></div><div className="activity-list">{data.audit.slice(0, 5).map((event) => <div className="activity-row" key={event.id}><div><strong>{event.kind.replaceAll("_", " ")}</strong><p>{event.message}</p></div><time>{relativeTime(event.createdAt)}</time></div>)}</div></section>
      </section>
    </section>
  </main>;
}
