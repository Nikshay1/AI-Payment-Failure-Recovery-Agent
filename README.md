# RecoverFlow

RecoverFlow is an explainable AI payment-failure recovery control plane. It is
a clickable portfolio demo: a Razorpay-shaped payment failure becomes a
policy-checked recovery plan, simulated customer journey, and auditable outcome.

## What is implemented

- D1-backed recovery queue, audit ledger, and demo inbox.
- A UPI issuer-outage scenario with correlated “failure weather”.
- Safe deterministic decisions that work with no API key.
- Optional server-side Groq analysis using strict JSON schema output.
- Visible separation between provider facts, AI proposal, policy controls, and
  executable customer action.
- Customer recovery simulation, success reconciliation, and duplicate-event
  replay that creates no duplicate side effect.
- A credential-free Razorpay event adapter with PII-minimizing normalization and
  HMAC verification utility for future contract tests.

## Safety boundary

The default build uses no payment-provider, messaging, or analytics credential.
`GROQ_API_KEY` is optional and remains server-side. Without it, the same policy
and recovery workflow runs in clearly labelled fallback mode. The project never
collects payment details, sends real messages, creates real payment links, or
charges an instrument.

## Local use

```bash
npm install
npm run dev
```

Open the local URL printed by the server. The app seeds an isolated browser demo
session in D1 on first use. To enable live Groq proposals, copy `.env.example`
to `.env.local` and add `GROQ_API_KEY`; fallback remains available for every
missing-key, rate-limit, and timeout case.

## Quality checks

```bash
npm run lint
npm run build
npm test
```

## Project layout

- `app/recovery-console.tsx` — operations desk and customer journey.
- `app/api/recovery/route.ts` — demo commands and server-only Groq boundary.
- `db/recovery-store.ts` — D1 initialization, persistence, and audit ledger.
- `lib/razorpay-adapter.ts` — provider-shaped failure normalization and HMAC utility.
- `implmenetation_plan.md` — detailed product/implementation plan.

All dashboard values are synthetic demo data. Opportunity scores are transparent
heuristics, not probability claims.
