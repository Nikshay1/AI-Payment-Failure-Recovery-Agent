export type RazorpaySignal = "signed_webhook" | "checkout_observation" | "simulator";

export type NormalizedPaymentFailure = {
  provider: "razorpay";
  signal: RazorpaySignal;
  providerEventId: string;
  paymentId: string;
  orderId: string | null;
  amountMinor: number;
  currency: string;
  method: string;
  errorCode: string | null;
  errorSource: string | null;
  errorStep: string | null;
  errorReason: string | null;
  category: "customer_auth" | "funding" | "transient_external" | "risk_or_compliance" | "unknown";
};

type RazorpayEntity = {
  id?: string;
  order_id?: string | null;
  amount?: number;
  currency?: string;
  method?: string;
  error_code?: string | null;
  error_source?: string | null;
  error_step?: string | null;
  error_reason?: string | null;
};

function classify(entity: RazorpayEntity): NormalizedPaymentFailure["category"] {
  const reason = `${entity.error_code ?? ""} ${entity.error_source ?? ""} ${entity.error_step ?? ""} ${entity.error_reason ?? ""}`.toLowerCase();
  if (/risk|fraud|compliance/.test(reason)) return "risk_or_compliance";
  if (/otp|authentication|pin/.test(reason)) return "customer_auth";
  if (/fund|balance|insufficient/.test(reason)) return "funding";
  if (/bank|gateway|network|timeout|internal|issuer/.test(reason)) return "transient_external";
  return "unknown";
}

/** Normalize only policy-relevant facts; PII and arbitrary provider metadata are excluded. */
export function normalizeRazorpayFailure(
  payload: unknown,
  signal: RazorpaySignal = "simulator",
  eventId = "evt_demo",
): NormalizedPaymentFailure {
  const root = (payload ?? {}) as { payload?: { payment?: { entity?: RazorpayEntity } } };
  const entity = root.payload?.payment?.entity ?? {};
  return {
    provider: "razorpay", signal, providerEventId: eventId, paymentId: entity.id ?? "pay_unknown",
    orderId: entity.order_id ?? null, amountMinor: Number.isFinite(entity.amount) ? Math.max(0, entity.amount ?? 0) : 0,
    currency: entity.currency ?? "INR", method: entity.method ?? "unknown", errorCode: entity.error_code ?? null,
    errorSource: entity.error_source ?? null, errorStep: entity.error_step ?? null, errorReason: entity.error_reason ?? null,
    category: classify(entity),
  };
}

export async function verifyRazorpaySignature(rawBody: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return mismatch === 0;
}
