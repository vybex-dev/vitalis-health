// src/app/api/visit-prep/questions/route.ts: API route that suggests questions to ask at a doctor visit.
import { z } from "zod";
import { verifyRequestToken, adminAvailable } from "@/lib/firebase/admin";
import { generateGeminiJSON, geminiAvailable } from "@/lib/ai/gemini";
import { VISIT_QUESTIONS_SYSTEM_PROMPT } from "@/lib/ai/systemPrompts";
import { checkRateLimit } from "@/lib/rateLimit";
import { anonIpLimited } from "@/lib/api/guard";
import type { VisitBrief } from "@/lib/visitBrief";

export const runtime = "nodejs";

const Schema = z.object({
  questions: z.array(z.string().min(1).max(300)).max(8),
  topicsToRaise: z.array(z.string().min(1).max(200)).max(6).default([]),
});

export async function POST(request: Request) {
  if (!adminAvailable) {
    return Response.json({ error: "Server isn't configured yet (Firebase Admin credentials missing). See README.md." }, { status: 503 });
  }
  const auth = await verifyRequestToken(request);
  if (!auth) return Response.json({ error: "Sign in required." }, { status: 401 });

  const anonBlock = anonIpLimited(request, auth, "visit-questions");
  if (anonBlock) return anonBlock;

  const { allowed, resetInMs } = checkRateLimit(`visit-q:${auth.uid}`, 10, 30 * 60 * 1000);
  if (!allowed) {
    return Response.json({ error: `Try again in ${Math.ceil((resetInMs ?? 0) / 60000)} min.` }, { status: 429 });
  }
  if (!geminiAvailable()) {
    return Response.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 503 });
  }

  let body: { brief?: VisitBrief };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const b = body.brief;
  if (!b || typeof b !== "object") return Response.json({ error: "Missing brief." }, { status: 400 });

  // Send only the facts the model needs (and nothing identifying beyond a first name).
  const compact = {
    reasonForVisit: b.reasonForVisit,
    patient: { age: b.patient?.age, sex: b.patient?.sex, conditions: b.patient?.conditions?.slice(0, 10), allergies: b.patient?.allergies?.slice(0, 10) },
    medications: (b.medications ?? []).slice(0, 15),
    vitals: (b.vitals ?? []).slice(0, 10),
    flaggedLabs: (b.flaggedLabs ?? []).slice(0, 15),
    recentSymptomChecks: (b.recentSymptomChecks ?? []).slice(0, 5),
    mood: b.mood,
    discussionPoints: (b.discussionPoints ?? []).slice(0, 10),
  };

  try {
    const raw = await generateGeminiJSON<unknown>(VISIT_QUESTIONS_SYSTEM_PROMPT, JSON.stringify(compact), { maxOutputTokens: 4096 });
    return Response.json(Schema.parse(raw));
  } catch (err) {
    console.error("Visit questions error", err);
    return Response.json({ error: "Couldn't generate questions right now. Please try again." }, { status: 502 });
  }
}
