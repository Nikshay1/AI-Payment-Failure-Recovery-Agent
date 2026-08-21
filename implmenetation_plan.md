# RecoverFlow — Detailed Implementation Plan

> Working title: **RecoverFlow**  
> Product: an explainable AI payment-failure recovery control plane  
> Planning date: 21 August 2026  
> Status: plan only; implementation must not start until explicitly approved

## 1. Executive decision

Build a polished, end-to-end demo that receives a Razorpay-shaped payment failure, diagnoses what happened, proposes a safe recovery plan with Groq, executes that plan inside a simulated customer journey, reconciles the eventual result, and shows exactly why every action was taken.

The product should feel like a small but credible payments operations system, not a chatbot wrapped around an API call. Its core value is the combination of:

1. a deterministic payment state machine;
2. provider-aware failure diagnosis;
3. an AI planner constrained by explicit business policy;
4. an idempotent action executor;
5. a customer-facing recovery experience;
6. an audit trail and measurable outcome.

The application will require **only one runtime API credential: `GROQ_API_KEY`**. It will not require Razorpay, email, SMS, analytics, vector database, or paid hosting credentials to demonstrate the complete flow. Razorpay compatibility will be proven with official payload-shaped fixtures and adapter contract tests. Connecting a real Razorpay account is outside the currently approved credential constraint and must not enter the build unless the user later changes that constraint.

The recommended deployment is a Cloudflare Worker serving a React application and API, with Cloudflare D1 for persistence. Both have free plans with hard usage limits suitable for a public portfolio demo. The app must also include a deterministic showcase fallback so Groq rate limiting or an exhausted free quota never destroys the demo.

## 2. Why this is the right project

Payment recovery is a real and difficult problem because a failed payment is not a single condition. The correct next action depends on the failure source, payment method, failure step, whether the issue is transient, whether the customer has already tried repeatedly, whether a later success event has arrived, and whether contacting the customer is allowed.

A naive product sends the same “please retry” message after every failure. RecoverFlow will instead answer four operational questions:

- **What actually happened?** Normalize provider-specific failure data into a stable diagnosis.
- **Is recovery appropriate?** Stop duplicates, stale events, fraudulent/risky cases, and over-contact.
- **What is the best next step?** Choose timing, alternate payment methods, customer copy, and escalation.
- **Did it work?** Reconcile later events and attribute recovered revenue without double counting.

This creates a project that showcases product judgment, payment-domain thinking, AI safety, backend correctness, frontend quality, and deployment discipline in one coherent build.

## 3. Product positioning

### 3.1 One-line pitch

**RecoverFlow turns raw payment failures into safe, explainable recovery journeys—and proves which journeys recover revenue.**

### 3.2 Primary persona

A payments or revenue-operations manager at an Indian digital business who needs to understand failed payments and recover recoverable revenue without spamming customers or creating double-charge risk.

### 3.3 Secondary persona

An engineer or reviewer who needs to verify webhook correctness, policy enforcement, provider compatibility, data safety, and AI behavior.

### 3.4 Jobs to be done

- See at-risk and recovered value at a glance.
- Identify clusters such as an issuer-bank or UPI outage.
- Open a recovery case and understand the failure in plain language.
- See the evidence, policy checks, AI proposal, and final approved action separately.
- Preview or approve a recovery message.
- Experience the same flow from the customer side.
- Replay duplicate and out-of-order webhooks to verify system correctness.
- Continue operating if the model is slow, unavailable, or rate-limited.

## 4. Scope and assumptions

### 4.1 Scope for the application build

- India-first, INR-first, one-time ecommerce payment attempts.
- Razorpay-shaped payment events and error fields.
- UPI, cards, and netbanking as the initial payment methods.
- Synthetic merchants, customers, orders, and provider identifiers only.
- A built-in scenario simulator and customer inbox.
- A safe hybrid agent using Groq for diagnosis refinement, plan proposal, explanation, and message copy.
- A deterministic fallback engine that produces a complete recovery plan without AI.
- A public, isolated demo session for each visitor.
- A credential-free Razorpay contract adapter tested against payload-shaped fixtures after the default demo is complete.

### 4.2 Explicitly out of scope for the first release

- Moving real money or auto-charging a card/mandate.
- Storing card numbers, CVV, OTP, UPI PIN, or other payment credentials.
- Sending real email, SMS, or WhatsApp messages.
- Production merchant onboarding or multi-tenant authentication.
- A live Razorpay account, test key, webhook secret, or outbound Razorpay API call.
- Subscriptions, dunning, disputes, chargebacks, refunds, or payouts.
- Training or fine-tuning a model.
- A vector database or RAG layer.
- Multiple collaborating LLM agents.
- Claims that heuristic scores are calibrated probabilities.
- Paid infrastructure or another AI provider.

These exclusions are deliberate. A narrower one-time-payment flow with strong state management and safety is more credible than a wide but superficial “AI payments platform.”

## 5. Success criteria

### 5.1 User-visible success

A first-time reviewer can complete this path without documentation:

1. choose a failure scenario;
2. inject it;
3. watch the case move from detection to diagnosis to a recovery plan;
4. inspect why the plan was chosen and which safeguards ran;
5. approve or execute the safe demo action;
6. open the simulated customer inbox;
7. click the recovery link and pay using an alternate method;
8. return to the operations dashboard and see the case reconciled as recovered.

### 5.2 Engineering success

- Replaying the same webhook does not duplicate a case, action, link, or message.
- Delivering events in a different order cannot regress a terminal successful payment.
- A later success cancels all pending recovery actions.
- No raw PII is sent to Groq.
- No model-proposed action executes unless it is in an allowlist and passes policy validation.
- Every state change has an actor, timestamp, input evidence, reason code, and correlation ID.
- The entire demo remains usable without a Groq key or after a Groq `429` response.
- The public demo incurs no bill: free-plan limits fail closed into showcase mode.

### 5.3 Quality gates

- 100% schema-valid agent results after local validation; invalid or unavailable results use fallback.
- 0 policy violations across the evaluation fixture set.
- 0 duplicate side effects across duplicate-event and concurrent-request tests.
- 0 PII leakage across prompt snapshot tests.
- At least 90% expected-category agreement on the curated, unambiguous failure fixture set; ambiguous cases must safely become `unknown` or `manual_review` rather than being forced.
- All critical browser journeys pass in Chromium through Playwright.
- No critical accessibility findings from automated checks; the keyboard-only path works.

## 6. The “magic” demo

The main scenario should make the system’s intelligence and correctness visible, not merely return generated prose.

### 6.1 Hero scenario: a UPI issuer outage

1. The dashboard begins with seeded synthetic history and an active “failure weather” view.
2. The reviewer injects a ₹4,999 UPI failure caused by a bank-side availability issue.
3. RecoverFlow ingests the Razorpay-shaped event, validates it, assigns an event ID, and deduplicates it.
4. The pure domain engine creates a recovery case and correlates it with several recent failures from the same rail/bank.
5. The UI immediately shows deterministic facts: transient external failure, likely incident cluster, no evidence that the customer caused it, and a safe set of allowed actions.
6. A single Groq request returns a strict structured proposal: wait briefly, offer a different payment rail, use empathetic copy, and avoid blaming the bank.
7. The policy engine rejects or modifies anything outside its allowlist and records the difference between “AI proposed” and “system approved.”
8. The reviewer clicks **Execute in demo inbox**. A mock payment link and localized message appear in the customer journey.
9. The customer opens the link and chooses a card. The simulator emits success events.
10. The case closes as recovered, scheduled reminders are cancelled, recovered value updates, and the audit timeline explains the complete chain.

### 6.2 Correctness reveal: event chaos replay

Immediately after the hero scenario, provide a **Replay duplicate** control and an **Arrive out of order** control. The UI should visibly report:

- duplicate event ignored by `provider_event_id`;
- stale failure recorded but unable to override captured success;
- no second message or payment link created.

This is a memorable technical differentiator because webhook idempotency and ordering are real payment-system problems.

### 6.3 Safety reveal: a risky or unknown case

A second one-click scenario should show that the agent does not maximize recovery at any cost. For an unknown or risk-related failure, it should create a manual-review case, suppress customer messaging, and state which evidence is missing.

## 7. Product surfaces

### 7.1 Operations dashboard

Purpose: communicate the system’s value in under ten seconds.

Components:

- At-risk value, recovered value, recovery rate, and active cases.
- Clear **Synthetic demo data** label beside every aggregate.
- Failure funnel: failed → eligible → contacted → clicked → recovered.
- Failure weather: clusters by method, source, bank/rail, and time window.
- Active case table with amount, method, diagnosis, score, status, and next action.
- Recent recoveries feed.
- Groq status badge: `live`, `cached`, `fallback`, `rate-limited`, or `disabled`.
- “Run a scenario” primary action.

### 7.2 Recovery case workspace

Purpose: make the hybrid intelligence explainable.

Sections:

- Order and payment summary using masked synthetic identifiers.
- Normalized failure “DNA”: code, source, step, reason, method, issuer/rail, attempt count, and event time.
- Diagnosis: category, confidence band, evidence, uncertainties, and cluster signal.
- Opportunity score with a tooltip that says it is a configurable heuristic, not a probability.
- Three-column decision trace:
  - deterministic facts and safety gates;
  - AI-proposed plan;
  - policy-approved executable plan.
- Recovery timeline showing all state transitions and actors.
- Message/link preview and approval controls.
- Audit export as redacted JSON.
- Duplicate and out-of-order replay tools in demo mode.

### 7.3 Scenario lab

Purpose: let a reviewer explore the core logic without external credentials.

Controls:

- Scenario preset.
- Payment method, amount, customer history, attempt count, consent state, and locale.
- Failure source, step, and reason for an advanced custom scenario.
- Toggle for a correlated incident cluster.
- Toggle for duplicate delivery or out-of-order success.
- Normal speed or compressed demo clock.

The lab must show the exact provider-shaped JSON it will emit, while making clear it contains synthetic data.

### 7.4 Customer recovery journey

Purpose: prove the system does more than produce an internal recommendation.

Components:

- A simulated inbox containing email/SMS-style previews.
- A secure-looking, short-lived demo recovery link.
- A branded payment-choice page with unavailable/unsafe methods de-emphasized.
- Simulate success, failure, or abandonment.
- A confirmation screen and link-expiry behavior.

No real payment details are collected. Buttons emit scenario events only.

### 7.5 Playbook and learning view

Purpose: show how the system improves without pretending synthetic data is production evidence.

- Versioned playbooks and their allowed actions.
- Message variants and synthetic outcome counts.
- A simple Beta-Binomial/Thompson-sampling visualization can be added only after deterministic attribution is correct.
- The interface must label seeded and simulated outcomes explicitly.
- A reset-to-fixtures control returns the demo to a known state.

### 7.6 System health and limits

- Current execution mode and configured model ID.
- Groq requests used by the application’s own daily guard counter.
- Cache hits, fallback count, and model latency.
- D1 health, last migration, and scheduler status.
- No secrets or provider payload PII.

## 8. Failure taxonomy and recovery playbooks

Provider fields should first be preserved as normalized facts, then mapped to a small, stable domain taxonomy. Mapping tables must be configuration, not scattered conditionals.

| Domain category | Typical evidence | Default posture | Candidate action |
|---|---|---|---|
| `customer_auth` | incorrect OTP/PIN or authentication not completed | customer can act; avoid blame | reopen checkout with concise guidance |
| `insufficient_funds` | funding/balance reason from customer or issuer | do not hammer same method | suggest alternate method; one later reminder |
| `instrument_invalid` | expired, blocked, or invalid instrument | same-instrument retry is low value | request a different card/method |
| `limit_exceeded` | issuer/customer transaction limit | immediate repeat likely fails | suggest another method or later attempt |
| `transient_issuer` | issuer/bank unavailable or timeout | wait and route around incident | delay; recommend alternate rail |
| `transient_gateway` | gateway/network/internal availability | suppress repeated attempts | short delay; alternate method; incident signal |
| `business_configuration` | merchant/configuration error | customer cannot fix it | suppress contact; merchant escalation |
| `risk_or_compliance` | risk rule or suspicious condition | recovery action may be unsafe | manual review only |
| `already_resolved` | authorized/captured event or verified success | no recovery needed | cancel pending actions and close |
| `unknown` | missing or conflicting evidence | do not invent certainty | manual review or conservative generic action |

### 8.1 Initial scenario fixtures

Create fixtures for at least these cases:

1. UPI issuer unavailable, with a correlated cluster.
2. Card insufficient funds for a previously successful customer.
3. Expired card.
4. Incorrect OTP/customer-authentication failure.
5. Netbanking gateway timeout.
6. Merchant/business configuration failure.
7. Risk-related failure that must not trigger recovery.
8. Unknown provider reason with missing fields.
9. Duplicate `payment.failed` delivery.
10. Success arriving after failure.
11. Failure arriving after captured success.
12. Customer who has opted out or reached contact-fatigue limits.

Exact fixture fields must be checked against the current Razorpay payment webhook and error documentation during implementation; tests should keep the original provider payload and normalized result side by side.

Do not assume `payment.failed` webhooks provide a complete record of every checkout failure. Razorpay’s current payment webhook documentation notes a first-payment authorization caveat, while Checkout can expose client-side failure details. The provider boundary should therefore distinguish an authoritative signed webhook from an untrusted checkout observation and a simulator event. A checkout observation can open a provisional case in a future live integration, but it cannot authorize a customer-facing side effect until it is reconciled. Payment downtime events should also be modeled as first-class incident evidence rather than inferred by the LLM.

## 9. Domain logic

### 9.1 Processing pipeline

```text
provider/simulator event
        ↓
authenticate + size check + schema validation
        ↓
persist event once (provider event ID / payload hash)
        ↓
normalize provider payload into domain event
        ↓
reconcile current payment/order state
        ↓
apply safety gates and derive allowed actions
        ↓
classify + correlate + calculate opportunity score
        ↓
request one structured Groq proposal (or local fallback)
        ↓
validate proposal against schema and deterministic policy
        ↓
persist plan + idempotent scheduled actions
        ↓
execute mock actions / await customer outcome
        ↓
reconcile outcome + cancel obsolete work + attribute recovery
```

### 9.2 Payment state model

Use a monotonic state model with explicit precedence:

```text
created → attempted → failed
                   ↘ authorized → captured
                               ↘ refunded (future, display only)
```

`captured` is a terminal success for the MVP. A later or delayed failure event may be recorded for audit but must not regress the payment or reopen recovery. State transitions must use a compare-and-set version so concurrent requests cannot both apply effects.

### 9.3 Recovery case state model

```text
detected
  → analyzing
  → ready
  → awaiting_approval (when policy requires it)
  → scheduled
  → awaiting_customer
  → recovered | exhausted | escalated | suppressed | closed
```

Required rules:

- `recovered`, `suppressed`, and `closed` cannot return to an active state without an explicit operator action.
- A successful payment closes all open cases for the same order and cancels pending actions.
- Only one active case may exist for the same order/failure episode.
- Every action has a deterministic idempotency key such as `case_id + playbook_version + action_type + sequence`.

### 9.4 Safety gates before AI

Run these gates before spending a Groq request:

1. Is the event authentic or an explicitly marked demo event?
2. Has this provider event already been processed?
3. Is the order already paid/captured?
4. Is there an active case for the same failure episode?
5. Is the category in `risk_or_compliance` or `business_configuration`?
6. Has the customer opted out?
7. Has the contact-frequency limit been reached?
8. Is a known provider incident active?
9. Is the payload sufficiently complete to automate safely?

Blocked cases should still produce a useful deterministic explanation, but should not call the model unless an operator explicitly asks for analysis.

### 9.5 Opportunity score

Use a transparent 0–100 **recovery opportunity score**, not a claimed probability. Store every component.

Initial configurable factors:

- base score by failure category;
- previous successful payment history;
- availability of an alternate payment method;
- transient incident correlation;
- age of the failure;
- number of attempts in the episode;
- recent contact fatigue;
- explicit safety blocks.

The UI must display factor contributions. Initial weights are product heuristics in a versioned JSON policy file. They may be calibrated only after real labeled outcomes exist. At-risk amount and recovered amount are factual; “expected recovered value” should not be presented as factual in the demo.

### 9.6 Incident correlation (“failure weather”)

Within a rolling window, group failures by combinations such as:

- payment method + error source + error reason;
- UPI PSP/VPA handle when available;
- card issuer/network when safely available;
- netbanking bank code;
- provider downtime event.

The demo policy can declare a cluster after a minimum count within the window. The exact threshold belongs in configuration. When a cluster is active:

- increase confidence that the issue is external/transient;
- suppress advice that asks the customer to repeat the identical action immediately;
- prefer an alternate rail;
- deduplicate incident messaging;
- show the cluster as evidence, not as a model guess.

### 9.7 Contact and retry policy

Demo defaults, clearly marked as configurable rather than industry rules:

- maximum two customer touches per 24 hours and three per seven days;
- no sends outside configured quiet hours;
- no immediate same-method retry for insufficient funds, invalid instruments, known outages, or risk cases;
- no more than one active recovery link per order;
- expire links and cancel scheduled touches after success;
- amount and risk thresholds can require human approval;
- only the built-in demo inbox may be auto-executed in the initial release.

Do not automatically charge a payment instrument. “Retry” in this project means inviting the customer into a new checkout attempt unless a future, separately reviewed recurring-payment integration supports something else.

## 10. AI agent design

### 10.1 Role of Groq

Groq should add contextual judgment and good communication where rules alone become brittle:

- refine an ambiguous diagnosis while stating uncertainty;
- choose among a policy-provided list of allowed recovery strategies;
- explain the recommendation in concise operational language;
- create customer-safe message variants using placeholders;
- identify missing evidence and recommend manual review.

Groq must not:

- determine whether a payment actually succeeded;
- invent provider fields or customer history;
- receive raw email, phone, name, address, VPA, card data, or free-form notes;
- execute arbitrary tools;
- create discounts or promises not present in policy;
- override consent, fatigue, risk, idempotency, or payment-state rules;
- directly send a message or initiate a charge.

### 10.2 Model choice

Recommended default: `openai/gpt-oss-20b` through Groq.

Reason:

- Groq currently documents strict JSON Schema output for this model.
- It is sufficient for a small, constrained planning task.
- It preserves free-tier tokens compared with using the larger model.

Keep `GROQ_MODEL` configurable and verify model availability during startup/health checks because hosted model catalogs and rate limits can change. Do not silently switch to a non-Groq provider. If the configured model is unavailable, use the local deterministic planner.

### 10.3 One-call architecture

Use at most one model request per eligible failure episode. Do not build a conversational agent loop.

The request includes only:

- normalized, allowlisted failure facts;
- coarse customer history (`new`, `returning`, `previously_successful`);
- attempt count and time since failure;
- incident correlation summary;
- locale and tone;
- the allowed strategy/action enums;
- relevant policy constraints;
- a request for a strict schema result.

The response schema should contain required fields only and set `additionalProperties: false` throughout. Proposed shape:

```ts
type AgentProposal = {
  diagnosis: {
    category: FailureCategory;
    confidence: "low" | "medium" | "high";
    rationale_codes: RationaleCode[];
    uncertainty: string;
  };
  strategy: {
    playbook_id: AllowedPlaybookId;
    proposed_actions: Array<{
      type: AllowedActionType;
      delay_minutes: number;
      payment_method: AllowedPaymentMethod | "none";
    }>;
  };
  customer_message: {
    subject: string;
    body: string;
    cta: string;
  };
  operator_summary: string;
};
```

In the real schema, enums must come from the policy-generated allowlist. Strings need conservative maximum lengths. All output is parsed and validated again with Zod before use.

### 10.4 Prompt security and privacy

- Build the prompt from typed fields, never by concatenating raw provider JSON.
- Treat all event metadata and descriptions as untrusted data, not instructions.
- Replace identity with placeholders such as `{{customer_first_name}}` and `{{recovery_url}}`; render placeholders after validation, outside the model.
- Omit or bucket exact values when not needed. The amount can be passed as an INR band for planning while exact formatted amount is rendered later.
- Include explicit copy constraints: no blame, false urgency, guaranteed success, sensitive payment details, or invented offers.
- Store prompt version, sanitized input hash, model ID, latency, token usage, and validated output—not hidden reasoning.
- Add prompt snapshot tests that fail if disallowed PII keys or fixture values appear.

### 10.5 Policy validation after AI

The policy engine receives the proposal and returns:

```ts
type PolicyVerdict = {
  status: "approved" | "modified" | "rejected";
  executable_actions: ExecutableAction[];
  removed_actions: Array<{ action: ProposedAction; reason_code: string }>;
  reasons: string[];
  requires_human_approval: boolean;
};
```

The UI must show this verdict. A rejected proposal is a successful safety outcome, not an application error.

### 10.6 Resilience and quota protection

- Timeout the Groq request after a short configurable wall-clock budget.
- On timeout, `429`, `5xx`, refusal, invalid content, or unavailable model, immediately use the local planner.
- Respect `retry-after`; do not loop retries in the user request.
- Cache by sanitized scenario fingerprint + policy version + prompt version + model ID.
- Apply per-session and global daily AI call limits in D1.
- Start with a global application cap around 75 uncached model calls/day, then adjust only after comparing actual token use with the Groq account’s current limits.
- Seed common demo scenarios into the cache during a controlled setup run or ship reviewed fallback results, so public reviewers rarely consume quota.
- Display the execution mode honestly: live, cached, or deterministic fallback.

The current published Groq free limits are not a contract and must not be hard-coded as permanent assumptions. The system should read returned rate-limit headers where available and expose its own conservative guard status.

## 11. Technical architecture

### 11.1 Recommended stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript with strict compiler settings | shared contracts across browser, worker, tests, and agent |
| Web UI | React + Vite | fast, mature, static-asset friendly |
| Styling | Tailwind CSS plus small accessible primitives | polished UI without a paid design system |
| API | Cloudflare Worker with Hono | small edge-compatible router, low overhead |
| Persistence | Cloudflare D1 (SQLite semantics) | free persistent relational storage and unique constraints |
| Validation | Zod + JSON Schema generation | one source of truth for boundaries and Groq output |
| Charts | lightweight SVG/Recharts only where useful | readable dashboard without a separate analytics service |
| Unit/integration tests | Vitest | fast TypeScript tests |
| Browser tests | Playwright | verifies the complete reviewer and customer journeys |
| Property tests | fast-check | duplicate/order/concurrency invariants |
| Package manager | pnpm workspace | shared packages and reproducible installs |
| Hosting | Cloudflare Workers static assets + Worker API | one free deployment, HTTPS, server secret, and D1 binding |

All chosen libraries are free/open source. Pin versions in the lockfile and use automated dependency review; exact versions should be selected when implementation begins rather than frozen in this plan.

### 11.2 Why Cloudflare instead of Vercel for this project

Vercel Hobby could host the frontend and functions, but persistence would require another service/account or browser-only state. Cloudflare combines static hosting, server code, scheduled triggers, logs, and D1 under one free platform. The production runtime still has only the Groq API credential; D1 is a platform binding, not another external API key.

The trade-off is the Workers Free CPU limit. Keep request handlers small, use indexed D1 queries, move expensive static work to build time, and remember that waiting on the Groq network call is wall time rather than CPU time. Load-test the actual bundle before deployment.

### 11.3 High-level topology

```text
Browser (merchant cockpit / scenario lab / customer inbox)
          │ same-origin HTTPS
          ▼
Cloudflare Worker + Hono
  ├─ API boundary and demo-session isolation
  ├─ event ingestion and reconciliation
  ├─ domain policy / action executor
  ├─ Groq client (server-side key only)
  ├─ credential-free Razorpay contract adapter (fixtures/tests only)
  └─ scheduled-action processor
          │
          ▼
Cloudflare D1
  ├─ normalized events and payment attempts
  ├─ recovery cases and action outbox
  ├─ messages, links, outcomes, and audit log
  └─ rate-limit counters and response cache
```

### 11.4 Suggested repository layout

```text
.
├─ apps/
│  ├─ web/
│  │  ├─ src/app/                 # routes, providers, error boundaries
│  │  ├─ src/features/dashboard/
│  │  ├─ src/features/cases/
│  │  ├─ src/features/lab/
│  │  ├─ src/features/customer/
│  │  ├─ src/features/system/
│  │  └─ src/components/          # reusable accessible UI
│  └─ worker/
│     ├─ src/routes/
│     ├─ src/services/
│     ├─ src/repositories/
│     ├─ src/middleware/
│     ├─ src/scheduler.ts
│     └─ src/index.ts
├─ packages/
│  ├─ contracts/                  # Zod API/provider schemas and shared types
│  ├─ domain/                     # pure state machines, policy, scoring, reducers
│  ├─ agent/                      # Groq prompt, schema, validator, fallback planner
│  ├─ scenarios/                  # synthetic fixtures and expected decisions
│  └─ config/                     # shared lint/TypeScript/test configuration
├─ migrations/                    # ordered D1 SQL migrations
├─ tests/
│  ├─ integration/
│  ├─ e2e/
│  ├─ evals/
│  └─ fixtures/
├─ docs/                          # architecture, threat model, demo script
├─ wrangler.jsonc
├─ pnpm-workspace.yaml
├─ package.json
├─ .dev.vars.example
├─ .env.example
├─ README.md
└─ implmenetation_plan.md
```

The `domain` package must remain pure and free of network/database dependencies. The worker and browser fallback can both use it, ensuring showcase mode behaves like the server rather than becoming an unrelated hard-coded animation.

## 12. Data design

Use UUID/ULID application IDs, integer currency minor units, UTC timestamps, and explicit `demo_session_id` isolation. Never use floating-point currency.

### 12.1 Core tables

#### `demo_sessions`

- `id`, `created_at`, `last_seen_at`, `expires_at`
- `locale`, `clock_multiplier`, `execution_mode`
- cleanup index on `expires_at`

#### `customers`

- `id`, `demo_session_id`, `display_alias`
- coarse segment/history fields
- consent flags and contact counters
- no real contact information

#### `orders`

- `id`, `demo_session_id`, `provider_order_id`
- `customer_id`, `amount_minor`, `currency`
- `status`, `created_at`, `paid_at`, `version`
- unique scoped provider ID

#### `payment_attempts`

- `id`, `demo_session_id`, `order_id`, `provider_payment_id`
- method and safe provider dimensions
- status and normalized error code/source/step/reason
- attempt number, event time, version

#### `provider_events`

- `id`, `demo_session_id`, `provider`, `provider_event_id`
- `event_type`, `payload_hash`, `normalized_payload_json`
- `signature_status`, `source_mode`, `event_occurred_at`, `received_at`, `processed_at`
- unique `(provider, demo_session_id, provider_event_id)` for demo events
- an appropriate provider-wide uniqueness rule for a future real merchant tenant

Do not persist raw payloads containing PII in the public demo. Store a redacted normalized representation and a hash of the original raw body when needed for audit.

#### `recovery_cases`

- `id`, `demo_session_id`, `order_id`, `payment_attempt_id`
- status, category, confidence band, opportunity score
- score-components JSON, incident-cluster ID
- policy version, prompt version, model ID, model execution mode
- AI proposal JSON, policy verdict JSON, opened/closed timestamps, version

#### `recovery_actions`

- `id`, `case_id`, `action_type`, `sequence`
- `idempotency_key` unique
- status, scheduled time, executed time, cancelled time
- validated payload JSON, policy reason codes, error code

Use an outbox-style lifecycle: `pending → executing → succeeded | failed | cancelled`. Claim actions atomically so two scheduler/request invocations cannot execute the same action.

#### `recovery_links`

- `id`, `case_id`, `token_hash`, `expires_at`, `status`
- never store the plaintext token after creation
- one active link per case/order

#### `messages`

- `id`, `case_id`, `action_id`, `channel`
- template/variant ID, rendered safe content, status
- sent, opened, clicked timestamps
- demo inbox only in the MVP

#### `audit_events`

- append-only `id`, `case_id`, `correlation_id`, `sequence`
- actor type/ID, event type, reason codes, safe details JSON, timestamp
- optional previous-hash/current-hash fields for a later tamper-evident chain

#### `incident_clusters`

- cluster dimensions, window, failure count, status, evidence, timestamps

#### `agent_cache` and `usage_counters`

- fingerprint, versions, validated response, expiry
- daily bucket, model, request count, token counts, fallback count

### 12.2 Indexes and constraints

At minimum:

- unique provider event IDs;
- unique provider payment/order IDs within tenant/session scope;
- unique action idempotency keys;
- unique active recovery link enforced through transaction/application invariant;
- indexes on session + status + updated time for lists;
- indexes on order ID, case ID, scheduled action time, event time, and cluster dimensions;
- check constraints for currency, non-negative integer amounts, known statuses, and score range.

Each dashboard query must be inspected using D1 query metadata so an unindexed full-table scan does not waste free-plan row reads.

## 13. API design

All responses should use a consistent envelope with `data`, `error`, `correlation_id`, and `execution_mode` where relevant. Validate request and response contracts.

### 13.1 Demo and session

- `POST /api/demo/session` — create an isolated session and seed its baseline fixtures.
- `POST /api/demo/reset` — reset only the caller’s demo session.
- `GET /api/demo/scenarios` — list fixtures and expected teaching points.
- `POST /api/demo/scenarios/:scenarioId/run` — emit a signed internal demo event.
- `POST /api/demo/events/replay` — duplicate or reorder a selected event.
- `POST /api/demo/clock/advance` — advance compressed scenario time and execute due work.

Use an unguessable, secure, HttpOnly, SameSite session cookie. Demo reset must never affect another visitor.

### 13.2 Operations

- `GET /api/dashboard` — aggregate metrics, funnel, clusters, active cases.
- `GET /api/cases` — filterable/paginated case list.
- `GET /api/cases/:id` — complete case, decision trace, actions, and audit timeline.
- `POST /api/cases/:id/analyze` — bounded, idempotent analysis trigger.
- `POST /api/cases/:id/actions/:actionId/approve` — approve when required.
- `POST /api/cases/:id/actions/:actionId/execute` — execute only a validated demo action.
- `POST /api/cases/:id/suppress` — operator suppression with a reason.
- `GET /api/cases/:id/audit-export` — redacted JSON export.

### 13.3 Customer journey

- `GET /api/customer/inbox` — current session’s simulated inbox.
- `GET /api/recovery/:token` — validate hashed, unexpired, unused token.
- `POST /api/recovery/:token/attempt` — simulate success/failure/abandonment and emit domain events.

Use single-use semantics for a completed recovery link. Never expose internal case data through the public token endpoint.

### 13.4 Provider contract boundary

The approved build does **not** expose a live Razorpay webhook route and does not request Razorpay credentials. Instead, implement a pure `RazorpayEventAdapter` that accepts a raw body, safe header values, and an injected secret argument. Exercise it through fixture tests and the scenario lab using a non-secret test vector.

The adapter contract must prove that a future `POST /api/webhooks/razorpay` route could:

1. read the raw body once;
2. verify `X-Razorpay-Signature` with HMAC-SHA256 before JSON parsing;
3. validate size and schema;
4. use `x-razorpay-event-id` as the provider idempotency key;
5. persist/acknowledge promptly;
6. process through the same normalized domain pipeline as simulator events;
7. tolerate duplicate and out-of-order delivery.

Model three provider signal types explicitly:

- `signed_webhook` — authoritative after verification in a future live integration;
- `checkout_observation` — useful but untrusted client-side failure evidence that cannot trigger real side effects by itself;
- `simulator` — synthetic, session-scoped input used by this project.

Also define normalized contracts for `payment.downtime.started` and its resolution event so failure weather can use provider-declared incident evidence. Exposing a live route or adding real Razorpay keys is a future scope change requiring explicit user approval.

### 13.5 System

- `GET /api/health` — deployment, database, migration, and model configuration status without secrets.
- `GET /api/system/usage` — session-safe quota and fallback status.

## 14. Frontend experience and visual direction

Use an original visual identity rather than copying Razorpay’s site. A dark operations cockpit with restrained electric-blue/green status color can connect to the payment domain while remaining distinct.

### 14.1 Design principles

- Lead with value and active state, not configuration forms.
- Make the decision process visible through progressive disclosure.
- Use motion only for meaningful state transitions; honor reduced-motion preferences.
- Never rely on color alone for payment/case status.
- Use skeletons for network waits and show deterministic facts before Groq returns.
- Label live AI, cached AI, and fallback responses accurately.
- Make synthetic/demo data impossible to mistake for merchant data.

### 14.2 Key components

- Metric cards with comparison to seeded baseline.
- Failure funnel and method/source heat map.
- Case data table with keyboard-accessible sorting/filtering.
- State badge system shared across payment, case, and action states.
- Decision trace cards with evidence chips and policy verdict.
- Event timeline with raw/normalized toggle.
- Scenario drawer and JSON preview.
- Customer-device preview for messages and checkout.
- Toasts plus persistent inline status for important actions.
- Empty, loading, rate-limited, fallback, and error states designed explicitly.

### 14.3 Responsive and accessible behavior

- Desktop-first dashboard but fully usable at 360px width.
- Semantic headings, landmarks, tables, buttons, and form labels.
- Visible focus rings and logical focus movement after dialogs/actions.
- Accessible names for charts plus a tabular data alternative.
- Minimum AA contrast target.
- Keyboard path through scenario injection, case inspection, approval, inbox, and recovery.

## 15. Security, privacy, and responsible automation

### 15.1 Threat model priorities

- Public abuse draining the free Groq quota.
- Forged or replayed provider webhooks.
- Duplicate side effects from at-least-once delivery.
- Prompt injection through provider metadata.
- PII leakage to the model or logs.
- Guessable recovery links.
- Cross-session data access in the public demo.
- Stale events causing duplicate recovery after success.

### 15.2 Required controls

- Server-side Groq key only; never use a `VITE_`/public environment variable for it.
- Same-origin API, strict CORS, secure headers, and a restrictive CSP.
- Request size limits and Zod validation at every boundary.
- Session-scoped repository methods; do not rely on UI filtering.
- Constant-time HMAC comparison using Web Crypto for optional webhooks.
- Uniqueness constraints and atomic state transitions.
- High-entropy recovery tokens stored only as hashes.
- Per-session and global model request limits.
- Redaction before persistence/logging and before model calls.
- HTML-escape all generated content; render messages as text, not raw model HTML.
- Dependency audit, lockfile, and minimal Worker bundle.
- Demo data lifecycle cleanup via scheduled job.

### 15.3 Responsible automation policy

The default execution matrix should be:

| Action | Demo mode | Future real mode |
|---|---|---|
| classify and explain | automatic | automatic |
| create internal case | automatic | automatic |
| schedule internal task | automatic | automatic within policy |
| create mock link | automatic | n/a |
| send to demo inbox | automatic | n/a |
| create real payment link | unavailable | future scope change + explicit integration policy |
| send real customer message | unavailable | future scope change + consent/approval rules |
| charge instrument | prohibited | prohibited in this scope |
| risk case recovery | suppressed | manual review |

## 16. Observability and auditability

Do not add a paid monitoring service. Use structured Worker logs plus an in-app operational audit.

For every request and case:

- generate a correlation ID;
- record handler latency and safe error code;
- record model mode, latency, token use, and fallback reason;
- record state transition from/to values and version;
- record action claim/execute/cancel events;
- never log secrets, recovery tokens, raw signatures, or PII.

The case timeline should be reconstructable exclusively from audit events. Add a developer-only replay command that can rebuild a case from its normalized event fixture and compare the result with the stored state.

## 17. Testing and evaluation strategy

### 17.1 Unit tests

- Provider payload normalization.
- Failure taxonomy mapping.
- Opportunity score components and bounds.
- Payment and case state transitions.
- Policy gates and allowed-action calculation.
- Contact fatigue and quiet-hours behavior.
- Placeholder rendering and generated-copy escaping.
- Groq schema parsing and fallback selection.
- Recovery token hash/expiry/single-use behavior.

### 17.2 Property/invariant tests

Use generated event sequences to prove:

- duplicate events never create duplicate side effects;
- any permutation containing a captured success ends in success;
- stale failures cannot reopen a closed successful case;
- applying the same command twice is idempotent;
- scores always remain within bounds;
- blocked categories never produce executable customer-contact actions;
- no pending action survives a terminal recovered state.

### 17.3 Integration tests

Run against local D1:

- raw webhook verification before parsing;
- transaction/unique-constraint behavior under concurrent requests;
- full failure → plan → action → customer attempt → recovery pipeline;
- scheduler claims only due actions once;
- session isolation;
- API contract and error envelopes;
- migration from an empty database.

### 17.4 Agent evaluation set

Create a versioned JSONL/JSON fixture set with:

- sanitized input facts;
- deterministic allowed-action set;
- acceptable diagnosis categories;
- forbidden actions/phrases;
- required rationale codes;
- expected fallback playbook.

Evaluation layers:

1. **Offline deterministic CI:** test the fallback planner and policy against every case; costs no tokens.
2. **Recorded proposal tests:** validate previously reviewed Groq outputs against current policy/schema.
3. **Manual live Groq eval:** opt-in command capped to a small number of calls; never runs on every commit.

Score schema validity, acceptable category, forbidden action rate, unsupported-claim rate, copy safety, and policy modification rate. Never evaluate by vague “looks good” alone.

### 17.5 Browser tests

Critical Playwright journeys:

- first visit creates and seeds an isolated session;
- hero scenario completes end to end;
- duplicate/out-of-order replay displays the correct no-op result;
- risky case is suppressed;
- fallback mode completes without Groq;
- reset affects only the current session;
- expired recovery link cannot be used;
- mobile and keyboard journeys.

### 17.6 Performance checks

- Non-AI API paths should feel instant and target sub-300 ms at normal demo scale.
- The UI should render the deterministic diagnosis before waiting for the model.
- Cap payloads, pagination, and timeline sizes.
- Inspect Worker startup and CPU usage on the free plan.
- Track D1 rows read/written for dashboard queries and add indexes based on evidence.

## 18. Zero-cost operating plan

### 18.1 Services and cost controls

| Capability | Choice | Cost approach |
|---|---|---|
| AI | Groq free plan | one constrained call/case, cache, local fallback, hard daily cap |
| Hosting/API | Cloudflare Workers Free | static assets + low-CPU API; stop at free limit |
| Database | Cloudflare D1 Free | indexed demo-scale data; automatic session cleanup |
| Scheduled work | Worker cron or demo clock | very small due-action scan; no paid queue required |
| Email/SMS | built-in demo inbox | no provider account or per-message charge |
| Payment link | built-in simulator | no real payment gateway call |
| Analytics | D1 aggregates and Worker logs | no external analytics key |
| Monitoring | `/system` page + structured logs | no Sentry/Datadog account |
| CI | local first; GitHub Actions if repository allowance permits | no paid runner dependency |
| Domain | default `workers.dev` URL | no custom-domain purchase |

### 18.2 Current free-plan facts to re-check before deployment

As of this plan’s date, official documentation says:

- Groq publishes model-specific free limits and returns `429` plus rate-limit headers when exceeded.
- Cloudflare Workers Free includes 100,000 requests/day and a 10 ms CPU limit per HTTP invocation; network wait time is distinct from CPU time.
- D1 Free includes 5 million rows read/day, 100,000 rows written/day, and 5 GB total storage; exceeding free limits causes operations to fail until reset rather than automatically billing a free-plan project.

These numbers can change. Implementation must link to the official docs, re-check the account dashboard, avoid enabling a paid plan, and treat any quota error as a signal to use showcase/fallback mode.

### 18.3 Always-available showcase fallback

The built static frontend should include the pure domain kernel and scenario fixtures. If `/api/health` is unavailable or the visitor explicitly chooses **Showcase mode**, the browser runs the journey locally and stores state in IndexedDB/local storage. It must:

- show a clear “local showcase—no live AI” badge;
- support the hero, safety, and webhook chaos scenarios;
- use reviewed deterministic plan/copy fixtures;
- avoid pretending that a Groq call occurred;
- allow reset without any network.

This protects the portfolio experience from free-tier outages while the server-backed path remains the default.

## 19. Implementation phases

Implementation should proceed as vertical slices. Do not build every backend abstraction before a visible flow exists.

### Phase 0 — Confirm plan and freeze product contract

Deliverables:

- Approve this document or record requested changes.
- Lock the working product name or treat it as replaceable copy.
- Confirm the default one-key simulator-first scope.
- Convert success criteria into repository issues/checklists.
- Add `README.md` with the one-line pitch, architecture summary, and status.

Definition of done:

- No material open decision blocks Phase 1.
- Scope explicitly excludes real payment movement and messaging.

### Phase 1 — Foundation and walking skeleton

Tasks:

1. Create the pnpm workspace and strict TypeScript configuration.
2. Create React/Vite web app, Worker/Hono app, shared contracts, and pure domain package.
3. Configure linting, formatting, Vitest, Playwright, and build scripts.
4. Add Cloudflare local development and a first D1 migration.
5. Implement demo-session middleware and a health endpoint.
6. Build the app shell, navigation, status badges, error boundary, and empty dashboard.
7. Add environment examples containing `GROQ_API_KEY` only for the default path.
8. Add CI-quality commands: `lint`, `typecheck`, `test`, `test:e2e`, and `build`.

Definition of done:

- Fresh clone to local app requires only documented package install and run commands.
- App loads, creates an isolated session, reads/writes local D1, and passes the initial checks.
- No Groq or Razorpay integration yet.

### Phase 2 — One deterministic end-to-end recovery slice

Tasks:

1. Define the normalized payment event, order, attempt, case, action, and audit contracts.
2. Add the minimal schema/migrations and repositories.
3. Build the UPI issuer-outage scenario fixture and injector.
4. Implement idempotent event persistence and monotonic payment reconciliation.
5. Implement the first deterministic failure mapping and playbook.
6. Persist case, plan, and a mock inbox action.
7. Build the case workspace and customer inbox/payment simulator.
8. Emit a success event and close/cancel the case correctly.
9. Show the updated dashboard.

Definition of done:

- The hero journey works with no Groq key.
- The same event can be replayed without a duplicate message or link.
- A success event closes the case and updates factual recovered value.

### Phase 3 — Complete domain engine and scenario lab

Tasks:

1. Implement the full initial taxonomy as versioned mapping configuration.
2. Add safety gates, contact policy, scoring factors, and allowed-action derivation.
3. Add incident correlation and failure-weather aggregates.
4. Implement all initial scenario fixtures.
5. Add compressed demo clock and due-action processor.
6. Add duplicate and out-of-order replay tools.
7. Add property tests for event ordering, idempotency, and terminal states.
8. Finish case list, filters, evidence trace, and audit timeline.

Definition of done:

- Every scenario has a documented expected classification, posture, and outcome.
- Domain tests prove safety without involving an LLM.
- Unknown and risk cases fail safe.

### Phase 4 — Groq constrained planner

Tasks:

1. Implement the server-only Groq client with timeout and typed errors.
2. Create the sanitized `AgentInput` builder and PII-denylist tests.
3. Define strict JSON Schema and parallel Zod validation.
4. Add the one-call prompt and version it.
5. Implement proposal → policy verdict → executable plan.
6. Add caching, per-session/global quota counters, and fallback behavior.
7. Surface live/cached/fallback mode, latency, and policy modifications in the UI.
8. Build the offline and opt-in live evaluation harness.

Definition of done:

- No model output bypasses policy.
- The same scenario succeeds during Groq success, timeout, invalid response, `429`, and missing-key tests.
- Prompt snapshots contain no prohibited PII.

### Phase 5 — Product depth and customer experience

Tasks:

1. Finish polished dashboard funnel, failure weather, active cases, and recovery feed.
2. Add message preview, approval, localized English/Hinglish variants, and placeholder rendering.
3. Add secure hashed recovery tokens, expiry, and single-use behavior.
4. Add playbook/version view and clearly synthetic experiment outcomes.
5. Add action cancellation, suppression, and manual escalation controls.
6. Add audit export and optional hash chain.
7. Design every loading, error, empty, offline, and rate-limit state.
8. Complete responsive and accessibility pass.

Definition of done:

- A reviewer can understand the product without opening raw JSON.
- The customer journey feels complete but cannot be mistaken for a real payment.
- AI contribution and deterministic enforcement are both visible.

### Phase 6 — Credential-free Razorpay contract adapter

This phase must not block the public demo.

Tasks:

1. Implement the pure raw-body/header `RazorpayEventAdapter`; do not expose a live public route.
2. Verify raw-body HMAC-SHA256 behavior using a committed non-secret test vector.
3. Deduplicate fixture events using `x-razorpay-event-id`.
4. Add payment failure, success, Checkout-observation, and payment-downtime fixtures based on current official docs.
5. Map `error_code`, `error_source`, `error_step`, and `error_reason` to domain fields.
6. Treat Checkout failures as provisional/untrusted and downtime events as incident evidence.
7. Prove duplicate and out-of-order behavior with integration tests.
8. Document how a future live route would connect without adding it to the approved build.

Definition of done:

- Provider and simulator events enter the exact same domain pipeline.
- The deployed app has no Razorpay credential or live-provider dependency.
- Invalid signatures, duplicate events, provisional observations, and downtime signals have tests.

### Phase 7 — Hardening, deployment, and application package

Tasks:

1. Run the full unit, property, integration, eval, E2E, accessibility, and build suite.
2. Inspect D1 row usage, query plans, Worker bundle size, startup, and CPU.
3. Add cleanup cron for expired demo sessions and tokens.
4. Implement the static showcase fallback and verify it with the API offline.
5. Add security headers, rate limits, redaction review, and dependency audit.
6. Deploy to a free `workers.dev` URL with D1 and server-side Groq secret.
7. Verify no paid Cloudflare plan or automatic overage path is enabled.
8. Test the live URL from a private browser and mobile viewport.
9. Write a concise README: problem, magic demo, architecture, safety, setup, tests, trade-offs, screenshots.
10. Record a two-minute fallback walkthrough and add its link if desired.

Definition of done:

- A reviewer can click the live URL and complete the magic flow.
- The app still demonstrates the flow with Groq disabled and with API offline.
- Repository setup and architectural trade-offs are clear.
- No secret or real customer/payment data is present in Git history or deployment output.

## 20. Detailed build order inside each vertical slice

For every feature, follow this order:

1. Write the user-visible acceptance example.
2. Add or update the shared contract.
3. Add the domain behavior and unit/invariant test.
4. Add the migration/repository only if persistence is required.
5. Add the API handler and integration test.
6. Add the smallest complete UI path.
7. Add audit events, failure states, and observability.
8. Run targeted tests, then the full quality suite.

This prevents UI, API, and agent schemas from drifting and ensures each merge leaves a usable product.

## 21. Configuration plan

### 21.1 Default local/deployed secrets

Required for live AI only:

```dotenv
GROQ_API_KEY=
```

Non-secret configuration can live in `wrangler.jsonc` or versioned policy files:

- `GROQ_MODEL=openai/gpt-oss-20b`
- `AI_ENABLED=true`
- `AI_DAILY_CALL_CAP=75`
- `DEMO_MODE=true`
- `RAZORPAY_ADAPTER_ENABLED=false`
- policy version, prompt version, contact limits, quiet hours, cluster thresholds, and link expiry.

The app must start with `GROQ_API_KEY` absent and announce deterministic showcase mode rather than crashing.

### 21.2 Credential boundary

Do not add Razorpay, messaging, analytics, database-service, or other AI-provider credentials to `.env` examples. A test-only HMAC secret may live inside a clearly synthetic fixture because it authenticates no account and controls nothing. If the user later authorizes a live Razorpay integration, plan its secrets and deployment controls as a separate scope change.

## 22. Deployment runbook outline

The final README should turn this outline into verified commands:

1. Install pinned Node/pnpm versions.
2. Install dependencies.
3. Copy local variable examples and optionally add the Groq key.
4. Create/apply local D1 migrations.
5. Run development server and seed fixtures.
6. Run quality checks and production build.
7. Authenticate a free Cloudflare account for deployment.
8. Create the D1 database and bind it in Wrangler.
9. Apply remote migrations.
10. Add `GROQ_API_KEY` as a Worker secret.
11. Deploy static assets and Worker.
12. Run post-deploy smoke tests and verify free-plan usage.

Cloudflare authentication is deployment setup, not an additional application API dependency. Use the default free `workers.dev` domain so there is no domain cost.

## 23. Two-minute application video storyboard

If a recording is submitted alongside the live link:

- **0–10 seconds:** State the problem over the operations dashboard: not every failure deserves the same retry.
- **10–30 seconds:** Inject the UPI issuer-outage scenario and show immediate failure DNA/cluster evidence.
- **30–55 seconds:** Reveal the Groq proposal, policy verdict, and why they are separate.
- **55–80 seconds:** Execute the demo message, switch to customer inbox, and open the recovery link.
- **80–100 seconds:** Complete via an alternate method and show recovered value/timeline update.
- **100–112 seconds:** Replay a duplicate/out-of-order webhook and show zero duplicate effects.
- **112–120 seconds:** Flash the architecture: one Groq key, Cloudflare free tier, safe deterministic fallback, and test suite.

Keep the narration focused on core logic and originality, matching the challenge’s request for a working demo rather than surface polish alone.

## 24. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Public users exhaust Groq free quota | live analysis unavailable | cache, hard cap, per-session limit, deterministic fallback, honest mode badge |
| Groq model ID or schema support changes | request fails | configurable model, startup health, local planner, current-doc check |
| Cloudflare Worker CPU limit is exceeded | API requests fail | pure small handlers, indexed queries, build-time work, measure before deploy |
| Free hosting/database quota is exceeded | temporary outage | session cleanup, compact seed data, local showcase mode, no paid auto-upgrade |
| Demo looks like a generic chatbot | weak application | operational dashboard, state machine, customer journey, incident correlation, audit trace |
| AI makes an unsafe recommendation | trust failure | pre-gates, strict enums/schema, post-policy validator, allowlisted executor |
| Synthetic metrics look deceptive | credibility loss | persistent “synthetic demo data” labels and no fake probability claims |
| Duplicate/out-of-order webhooks corrupt state | double contact or false recovery | provider IDs, unique constraints, monotonic reconciliation, property tests |
| Real Razorpay credentials are unavailable | live integration cannot be shown | Razorpay-shaped simulator and contract adapter are the approved proof; no live account is required |
| Scope grows into subscriptions/notifications | project never finishes | enforce explicit out-of-scope list and phase gates |
| Browser fallback diverges from server logic | inconsistent demo | share pure domain package and scenario contracts between both |

## 25. World-class differentiators to protect during implementation

These features carry more signal than adding more pages or AI calls:

1. **Decision trace, not magic text:** facts → proposal → policy verdict → action.
2. **Webhook chaos replay:** duplicates and out-of-order events visibly handled.
3. **Failure weather:** correlated issues change the recovery strategy.
4. **Reconciliation guard:** a later success stops contact and prevents double recovery.
5. **Customer journey twin:** the reviewer experiences both merchant and customer sides.
6. **Honest AI degradation:** live, cached, and deterministic modes are explicit.
7. **Privacy by construction:** placeholders and coarse facts keep PII away from Groq.
8. **Measurable safety:** invariant and policy evaluation tests, not only prompt claims.
9. **₹0 architecture:** one AI credential, no real messaging/payment dependency, hard free-tier limits.

If schedule pressure appears, preserve these and cut secondary charts, complex experimentation, multilingual breadth, and optional real-provider calls first.

## 26. Final acceptance checklist

### Product

- [ ] One-click hero scenario tells a complete story.
- [ ] At least one safety scenario visibly refuses automation.
- [ ] Merchant and customer experiences are both present.
- [ ] Every metric is labeled factual vs heuristic vs synthetic.
- [ ] Live/cached/fallback AI status is always visible.

### Payments correctness

- [ ] Amounts use integer minor units.
- [ ] Webhook/event ingestion is idempotent.
- [ ] Event order cannot regress captured success.
- [ ] Success cancels pending recovery work.
- [ ] No automatic instrument charge exists.
- [ ] Razorpay contract-adapter signature tests use the raw body and HMAC-SHA256.

### AI safety

- [ ] Only Groq is used as an AI API.
- [ ] Groq key is server-side only.
- [ ] One request maximum per eligible failure episode.
- [ ] Strict schema plus local validation is enforced.
- [ ] PII-denylist prompt tests pass.
- [ ] All executable actions pass deterministic policy.
- [ ] Missing key, timeout, `429`, and invalid result all fall back safely.

### Security and privacy

- [ ] Synthetic data only.
- [ ] Sessions are isolated server-side.
- [ ] Recovery tokens are high entropy, hashed, expiring, and single-use.
- [ ] Generated copy is rendered as escaped text.
- [ ] Logs contain no keys, tokens, signatures, or PII.
- [ ] CSP, CORS, input-size, and rate-limit controls are enabled.

### Quality

- [ ] Lint, typecheck, unit, property, integration, and E2E checks pass.
- [ ] Critical keyboard/mobile journeys pass.
- [ ] D1 query usage and Worker CPU/startup are measured.
- [ ] Offline showcase mode is verified with the API unavailable.
- [ ] Fresh-clone and deployment instructions are reproduced once.

### Application submission

- [ ] Public live URL loads without reviewer setup.
- [ ] A two-minute recording is available as backup.
- [ ] README explains the problem, demo, architecture, safety, and trade-offs.
- [ ] No paid service or custom domain is required.
- [ ] Repository and demo contain no secrets or real customer data.

## 27. Official research basis

The plan uses the following current primary documentation. Re-check it when implementation begins because models, limits, and provider behavior can change.

### Groq

- [Rate limits](https://console.groq.com/docs/rate-limits) — free limits, rate-limit dimensions, headers, and `429` behavior.
- [Supported models](https://console.groq.com/docs/models) — current production model IDs and capabilities.
- [Structured Outputs](https://console.groq.com/docs/structured-outputs) — strict JSON Schema support and supported models.
- [API reference](https://console.groq.com/docs/api-reference) — OpenAI-compatible chat-completions endpoint and response format.

### Razorpay

- [Payment webhook events](https://razorpay.com/docs/webhooks/payments/) — `payment.failed` payload shape and payment error fields.
- [Validate and test webhooks](https://razorpay.com/docs/webhooks/validate-test/) — raw-body signature verification, HMAC-SHA256, idempotency, and out-of-order delivery.
- [Webhook best practices](https://razorpay.com/docs/webhooks/best-practices/) — at-least-once delivery and endpoint security.
- [About payment errors](https://razorpay.com/docs/errors/) — `code`, `source`, `step`, `reason`, and diagnostic intent.
- [Payment Links APIs](https://razorpay.com/docs/payments/payment-links/apis/) — future optional recovery-link adapter and signature requirements.

### Cloudflare

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) — free requests, CPU constraints, static assets, and logs.
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) — free row/storage limits, query metrics, and limit behavior.

## 28. Recommendation to approve

Approve implementation through **Phase 5 first**, with the Razorpay adapter in Phase 6 remaining optional. This yields the strongest application artifact under the actual constraints:

- it is fully clickable without credentials;
- Groq provides visible, constrained intelligence;
- payment-domain correctness is demonstrable;
- the project can be hosted and run for ₹0;
- future Razorpay connectivity could be added without redesigning the core, but is not part of this credential-constrained build.

The first implementation milestone should be the deterministic UPI-outage vertical slice. Once that slice proves ingestion, diagnosis, safe action, customer recovery, reconciliation, and idempotency, Groq can be added to a working system rather than becoming the system itself.
