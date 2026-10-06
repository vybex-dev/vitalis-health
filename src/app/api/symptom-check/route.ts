import { verifyRequestToken, adminAvailable } from "@/lib/firebase/admin";
import { generateGeminiJSON, geminiAvailable } from "@/lib/ai/gemini";
import { SYMPTOM_CHECK_SYSTEM_PROMPT } from "@/lib/ai/systemPrompts";
import { checkRateLimit } from "@/lib/rateLimit";
import { anonIpLimited } from "@/lib/api/guard";
import { detectRedFlags, emergencyNotice, maxUrgency, urgencyFloor } from "@/lib/safety/redFlags";
import { regionFromRequest } from "@/lib/safety/guard";
import type { SymptomCheck, UrgencyLevel } from "@/types";

export const runtime = "nodejs";

interface Body {
  bodyRegion: string;
  symptoms: string[];
  severity: number;
  durationHours: number;
  freeText?: string;
}

const VALID_URGENCY: UrgencyLevel[] = ["self_care", "routine", "prompt", "emergency"];

export async function POST(request: Request) {
  if (!adminAvailable) {
    return Response.json(
      { error: "Server isn't configured yet (Firebase Admin credentials missing). See README.md." },
      { status: 503 }
    );
  }
  const auth = await verifyRequestToken(request);
  if (!auth) return Response.json({ error: "Sign in required." }, { status: 401 });

  const anonBlock = anonIpLimited(request, auth, "symptom");
  if (anonBlock) return anonBlock;

  const { allowed, resetInMs } = checkRateLimit(`symptom:${auth.uid}`, 12, 10 * 60 * 1000);
  if (!allowed) {
    return Response.json(
      { error: `Too many checks in a row. Try again in ${Math.ceil((resetInMs ?? 0) / 1000)}s.` },
      { status: 429 }
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.bodyRegion || !Array.isArray(body.symptoms) || body.symptoms.length === 0) {
    return Response.json({ error: "Missing body region or symptoms." }, { status: 400 });
  }

  const severity = Math.max(1, Math.min(10, Number(body.severity) || 5));

  // ---- Deterministic safety floor (runs without any model).
  const redFlags = detectRedFlags(
    [body.bodyRegion, body.symptoms.join(", "), body.freeText ?? ""].join(". "),
  );
  const floor = urgencyFloor({ severity, redFlags });
  const plainNotice = emergencyNotice(redFlags, regionFromRequest(request)).replace(/\*\*/g, "");
  const ruleBasedEmergency = (): SymptomCheck["assessment"] => ({
    urgency: "emergency",
    summary: redFlags.triggered
      ? plainNotice
      : `You rated this ${severity}/10. Severity this high can signal something serious, so please seek urgent in-person care rather than waiting.`,
    possibleFactors: [],
    redFlags: redFlags.triggered ? redFlags.matches.map((m) => m.label) : [`Severity ${severity}/10`],
    selfCareTips: [],
    disclaimer: "This is general information, not a medical diagnosis.",
    safetyOverride: true,
  });

  if (!geminiAvailable()) {
    if (floor === "emergency") return Response.json(ruleBasedEmergency());
    return Response.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 503 });
  }

  const userContent = JSON.stringify({
    bodyRegion: body.bodyRegion,
    symptoms: body.symptoms.slice(0, 10),
    severity,
    durationHours: Math.max(0, Number(body.durationHours) || 0),
    notes: (body.freeText || "").slice(0, 800),
  });

  try {
    const raw = await generateGeminiJSON<Partial<SymptomCheck["assessment"]>>(
      SYMPTOM_CHECK_SYSTEM_PROMPT,
      userContent
    );

    const modelUrgency: UrgencyLevel = VALID_URGENCY.includes(raw.urgency as UrgencyLevel)
      ? (raw.urgency as UrgencyLevel)
      : "routine";
    // The prompt ASKS the model to treat red flags / severity >= 8 as emergencies.
    // Here we ENFORCE it: the final urgency is never lower than the rule-based floor.
    const urgency = maxUrgency(modelUrgency, floor);
    const overridden = urgency !== modelUrgency;

    const assessment: SymptomCheck["assessment"] = {
      urgency,
      summary: overridden ? ruleBasedEmergency().summary : raw.summary || "Here's what we can say from what you shared.",
      possibleFactors: Array.isArray(raw.possibleFactors) ? raw.possibleFactors.slice(0, 4) : [],
      redFlags: [
        ...new Set([
          ...(redFlags.triggered ? redFlags.matches.map((m) => m.label) : []),
          ...(Array.isArray(raw.redFlags) ? raw.redFlags : []),
        ]),
      ],
      selfCareTips: urgency === "emergency" ? [] : Array.isArray(raw.selfCareTips) ? raw.selfCareTips.slice(0, 4) : [],
      disclaimer: raw.disclaimer || "This is general information, not a medical diagnosis.",
      ...(overridden ? { safetyOverride: true } : {}),
    };

    return Response.json(assessment);
  } catch (err) {
    console.error("Symptom check error", err);
    // If the model is down but the rules say emergency, the user still gets the right answer.
    if (floor === "emergency") return Response.json(ruleBasedEmergency());
    return Response.json(
      { error: "Couldn't complete the assessment right now. Please try again shortly." },
      { status: 502 }
    );
  }
}
