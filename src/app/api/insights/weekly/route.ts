import { verifyRequestToken, adminAvailable } from "@/lib/firebase/admin";
import { generateGeminiJSON, geminiAvailable } from "@/lib/ai/gemini";
import { INSIGHT_SYSTEM_PROMPT } from "@/lib/ai/systemPrompts";
import { checkRateLimit } from "@/lib/rateLimit";
import type { VitalReading, JournalEntry, HealthInsight } from "@/types";

export const runtime = "nodejs";

interface Body {
  vitals: VitalReading[];
  journal: JournalEntry[];
}

type InsightResult = Pick<HealthInsight, "summary" | "highlights" | "watchOuts" | "suggestions">;

export async function POST(request: Request) {
  if (!adminAvailable) {
    return Response.json(
      { error: "Server isn't configured yet (Firebase Admin credentials missing). See README.md." },
      { status: 503 }
    );
  }
  const auth = await verifyRequestToken(request);
  if (!auth) return Response.json({ error: "Sign in required." }, { status: 401 });

  const { allowed, resetInMs } = checkRateLimit(`insight:${auth.uid}`, 8, 30 * 60 * 1000);
  if (!allowed) {
    return Response.json(
      { error: `You can generate a new insight again in ${Math.ceil((resetInMs ?? 0) / 60000)} min.` },
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

  const vitals = (body.vitals || []).slice(0, 60);
  const journal = (body.journal || []).slice(0, 20);

  const userContent = JSON.stringify({
    vitals: vitals.map((v) => ({
      type: v.type,
      value: v.value,
      secondaryValue: v.secondaryValue ?? undefined,
      unit: v.unit,
      recordedAt: v.recordedAt,
    })),
    journal: journal.map((j) => ({ date: j.date, mood: j.mood, symptoms: j.symptoms, hasNotes: Boolean(j.notes) })),
  });

  try {
    const result = await generateGeminiJSON<InsightResult>(INSIGHT_SYSTEM_PROMPT, userContent);
    return Response.json({
      summary: result.summary,
      highlights: result.highlights ?? [],
      watchOuts: result.watchOuts ?? [],
      suggestions: result.suggestions ?? [],
    });
  } catch (err) {
    console.error("Insight generation error", err);
    return Response.json({ error: "Couldn't generate an insight right now. Please try again shortly." }, { status: 502 });
  }
}
