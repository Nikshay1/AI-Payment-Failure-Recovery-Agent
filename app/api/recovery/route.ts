import { applyAnalysis, dashboard, executeAction, groqKey } from "@/db/recovery-store";

type Payload = { sessionId?: string; action?: "reset" | "execute" | "recover" | "replay" | "risk" | "analyze" };

function sessionId(value: unknown) {
  const candidate = typeof value === "string" ? value : "";
  return /^[a-zA-Z0-9_-]{8,80}$/.test(candidate) ? candidate : "recoverflow_demo";
}

export async function GET(request: Request) {
  const id = sessionId(new URL(request.url).searchParams.get("session"));
  return Response.json(await dashboard(id));
}

async function requestGroq() {
  const key = groqKey();
  const fallback = {
    mode: "fallback" as const,
    action: "Wait 15m · offer card",
    detail: "6 related UPI issuer failures point to a temporary external outage. Customer history is healthy; avoid an immediate same-rail retry.",
    plan: "Pause the original UPI rail for 15 minutes, then send one respectful recovery link with card and netbanking first. Stop every pending touch after payment success.",
  };
  if (!key) return fallback;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        temperature: 0.2,
        max_completion_tokens: 420,
        messages: [
          { role: "system", content: "You are a constrained payment recovery planner. Return only schema-valid JSON. Never ask for bank details, make guarantees, blame a customer, or recommend retrying the same UPI rail during an issuer outage." },
          { role: "user", content: "Facts: amount band INR 2k-10k; method UPI; failure source issuer/bank; 6 similar failures in ten minutes; customer is previously successful; allowed actions are wait, offer_card, offer_netbanking, create_one_recovery_link, manual_review. Produce a concise safe recovery proposal." },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "recovery_plan",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["action", "detail", "plan"],
              properties: {
                action: { type: "string", maxLength: 80 },
                detail: { type: "string", maxLength: 260 },
                plan: { type: "string", maxLength: 420 },
              },
            },
          },
        },
      }),
    });
    clearTimeout(timeout);
    if (!response.ok) return fallback;
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as { action?: string; detail?: string; plan?: string };
    if (!parsed.action || !parsed.detail || !parsed.plan) return fallback;
    return { mode: "live" as const, action: parsed.action.slice(0, 80), detail: parsed.detail.slice(0, 260), plan: parsed.plan.slice(0, 420) };
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as Payload;
  const id = sessionId(payload.sessionId);
  if (!payload.action) return Response.json({ error: "Action is required." }, { status: 400 });
  if (payload.action === "analyze") return Response.json(await applyAnalysis(id, await requestGroq()));
  return Response.json(await executeAction(id, payload.action));
}
