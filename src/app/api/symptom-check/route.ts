import { verifyRequestToken, adminAvailable } from "@/lib/firebase/admin";
import { generateGeminiJSON, geminiAvailable } from "@/lib/ai/gemini";
import { SYMPTOM_CHECK_SYSTEM_PROMPT } from "@/lib/ai/systemPrompts";
import { checkRateLimit } from "@/lib/rateLimit";
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

  const { allowed, resetInMs } = checkRateLimit(`symptom:${auth.uid}`, 12, 10 * 60 * 1000);
  if (!allowed) {
    return Response.json(
      { error: `Too many checks in a row. Try again in ${Math.ceil((resetInMs ?? 0) / 1000)}s.` },
      { status: 429 }
    );
  }

  if (!geminiAvailable()) {
    return Response.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 503 });
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

  const userContent = JSON.stringify({
    bodyRegion: body.bodyRegion,
    symptoms: body.symptoms.slice(0, 10),
    severity: Math.max(1, Math.min(10, Number(body.severity) || 5)),
    durationHours: Math.max(0, Number(body.durationHours) || 0),
    notes: (body.freeText || "").slice(0, 800),
  });

  try {
    const assessment = await generateGeminiJSON<SymptomCheck["assessment"]>(
      SYMPTOM_CHECK_SYSTEM_PROMPT,
      userContent
    );

    if (!VALID_URGENCY.includes(assessment.urgency)) {
      assessment.urgency = "routine";
    }
    if (!assessment.disclaimer) {
      assessment.disclaimer = "This is general information, not a medical diagnosis.";
    }

    return Response.json(assessment);
  } catch (err) {
    console.error("Symptom check error", err);
    return Response.json(
      { error: "Couldn't complete the assessment right now. Please try again shortly." },
      { status: 502 }
    );
  }
}
