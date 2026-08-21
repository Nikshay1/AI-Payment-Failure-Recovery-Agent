# RecoverFlow

> A safety-first recovery desk for failed payments — decide the next best action, create one respectful recovery journey, and leave an audit trail for every decision.

[Open the live demo](https://recoverflow-payment-recovery.peothanh46abc.chatgpt.site) · [Read the implementation plan](implmenetation_plan.md)

RecoverFlow is a full-stack product demo for a painful payments-operations problem: a payment has failed, the customer may still want to pay, and blindly retrying the same rail can make the experience worse.

Instead of treating an LLM as an autonomous payment agent, RecoverFlow separates **facts**, **policy**, **AI proposal**, and **customer action**. It shows how AI can improve recovery decisions without being allowed to make unsafe ones.

## Why this exists

Most payment-failure dashboards stop at “failed.” RecoverFlow asks the more useful question:

> What is the safest, highest-confidence next move for this customer — and why?

The demo starts with a UPI issuer-outage pattern. A customer with a healthy history should not be pushed into another immediate retry on the same failing rail. RecoverFlow pauses the rail, proposes an alternative method, permits at most one recovery link, and cancels pending work as soon as the payment succeeds.

## What you can try

1. Open the live demo and select a payment from the queue.
2. Click **Run AI analysis** to produce a constrained Groq proposal, or use the deterministic policy fallback.
3. Click **Create recovery link** to place a message in the simulated customer inbox.
4. Click **Choose another method** to simulate recovery and reconciliation.
5. Click **Test duplicate event** to see idempotency in action: no second customer message is created.
6. Use **Test safety gate** to confirm that manual-review cases cannot message a customer.

Everything is synthetic. No payment, message, customer identity, or payment instrument is real.

## The product in one view

```text
Provider-shaped failure event
          │
          ▼
  Normalize + minimize data
          │
          ▼
  Deterministic recovery policy ─────────────┐
          │                                  │
          ▼                                  │
  Optional Groq proposal (structured JSON)  │
          │                                  │
          └──── validate against policy ─────┘
                         │
                         ▼
         One safe, auditable recovery action
                         │
                         ▼
      Simulated inbox → payment success → stop work
```

## Safety is the feature

Payments recovery is a trust problem. RecoverFlow is deliberately designed so that “AI-powered” does not mean “AI has permission to do everything.”

| Guardrail | What it prevents |
| --- | --- |
| Deterministic policy before execution | An LLM cannot override retry, contact, or review rules. |
| Same-rail retry block | During the simulated issuer outage, UPI is not retried immediately. |
| One-link recovery flow | Duplicate events cannot create duplicate customer touches. |
| Reconciliation stop rule | Recovery work is cancelled after a simulated payment success. |
| Manual-review gate | High-risk cases cannot generate a customer message. |
| Audit ledger | Every action records who/what acted and the reason. |
| PII-minimizing adapter | The provider adapter normalizes only what recovery logic needs. |
| Server-only Groq key | `GROQ_API_KEY` never reaches the browser bundle. |
| Honest fallback | If Groq is unavailable, the app stays usable and labels the deterministic result. |

## Architecture

```text
React / Vinext user interface
          │
          ▼
Recovery API route
  ├── Policy-safe demo commands
  ├── Groq chat completion + JSON schema validation
  └── Groq failure diagnostics (without exposing secrets)
          │
          ▼
Cloudflare D1
  ├── Recovery cases
  ├── Customer inbox simulation
  └── Append-only-style audit events
```

### Stack

- **React + TypeScript + Vinext** for the responsive operations interface
- **Cloudflare Workers + D1** for the server API and durable demo state
- **Groq API** for optional, constrained recovery proposals
- **Drizzle schema + SQL migrations** for the persistence layer
- **No payment gateway, SMS, email, or analytics credentials** required

## Run it locally

### Prerequisites

- Node.js 22+
- npm
- Optional: a Groq API key

```bash
git clone https://github.com/Nikshay1/AI-Payment-Failure-Recovery-Agent.git
cd AI-Payment-Failure-Recovery-Agent
npm install
npm run dev
```

Open the local URL printed by the development server.

### Enable Groq analysis (optional)

RecoverFlow works without an API key. With no key, it uses its deterministic safety policy and clearly labels the result as a fallback.

```bash
copy .env.example .env.local
```

Then add your key to `.env.local`:

```env
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=openai/gpt-oss-20b
```

For a hosted deployment, add `GROQ_API_KEY` as a **secret** in the deployment environment, then redeploy. Never commit `.env.local`, paste keys into issues, or share screenshots containing them. If a key is exposed, revoke it in Groq and replace it.

## Quality checks

```bash
npm run lint
npm run build
npm test
```

## Repository guide

| Path | Purpose |
| --- | --- |
| `app/recovery-console.tsx` | Interactive recovery desk, queue, and customer journey simulation |
| `app/api/recovery/route.ts` | Server-side actions, Groq boundary, timeout handling, and safe diagnostics |
| `db/recovery-store.ts` | D1 setup, seeded cases, recovery state transitions, and audit events |
| `db/schema.ts` | Drizzle schema definitions |
| `drizzle/` | Generated database migrations |
| `lib/recovery.ts` | Shared domain types and formatting helpers |
| `lib/razorpay-adapter.ts` | Razorpay-shaped failure normalizer and HMAC verification utility |
| `implmenetation_plan.md` | Product rationale, phased build plan, safety model, and roadmap |

## A note on Razorpay integration

The project intentionally runs as a zero-credential simulator. It includes a Razorpay-shaped payload adapter and signature-verification utility, but it does **not** call Razorpay, create real payment links, or send real messages.

To connect a real provider in a production system, add authenticated webhook ingestion, provider signature verification, replay protection, a queue, explicit merchant controls, consent-aware messaging, observability, and human review workflows. Do not directly map model output to money movement or customer outreach.

## What is deliberately not claimed

- Recovery scores are transparent demo heuristics, not calibrated probabilities.
- The application does not promise revenue recovery or payment success.
- It is a portfolio-quality product prototype, not a production payment processor.
- Groq enriches a proposal; the deterministic safety policy remains the authority.

## Roadmap

- [ ] Provider webhook contract tests and event replay fixtures
- [ ] Merchant-configurable policy rules and approval thresholds
- [ ] Recovery experiment measurement with holdouts and causal metrics
- [ ] Human-review inbox for high-value or anomalous payments
- [ ] Consent-aware email/SMS provider adapters
- [ ] Full reconciliation and settlement-state ingestion

---

Built to make one point clear: **the best payment recovery agent does not just retry harder — it knows when to pause, route around failure, and protect the customer experience.**
