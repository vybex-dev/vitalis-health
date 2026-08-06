import { verifyRequestToken, adminAvailable } from "@/lib/firebase/admin";
import { generateGeminiJSON, geminiAvailable } from "@/lib/ai/gemini";
import { JOURNAL_SUMMARY_SYSTEM_PROMPT } from "@/lib/ai/systemPrompts";
import { checkRateLimit } from "@/lib/rateLimit";
import type { JournalEntry } from "@/types";

export const runtime = "nodejs";

interface Body {
  entries: JournalEntry[];
}

interface SummaryResult {
  summary: string;
  moodTrend: string;
  recurringSymptoms: string[];
  suggestion: string;
}

export async function POST(request: Request) {
  if (!adminAvailable) {
    return Response.json(
      { error: "Server isn't configured yet (Firebase Admin credentials missing). See README.md." },
      { status: 503 }
    );
  }
  const auth = await verifyRequestToken(request);
  if (!auth) return Response.json({ error: "Sign in required." }, { status: 401 });

  const { allowed, resetInMs } = checkRateLimit(`journal-summary:${auth.uid}`, 8, 30 * 60 * 1000);
  if (!allowed) {
    return Response.json(
      { error: `Try again in ${Math.ceil((resetInMs ?? 0) / 60000)} min.` },
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

  const entries = (body.entries || []).slice(0, 30);
  if (entries.length === 0) {
    return Response.json({ error: "No journal entries to summarize yet." }, { status: 400 });
  }

  const userContent = JSON.stringify(
    entries.map((e) => ({ date: e.date, mood: e.mood, symptoms: e.symptoms, notes: e.notes?.slice(0, 400) }))
  );

  try {
    const result = await generateGeminiJSON<SummaryResult>(JOURNAL_SUMMARY_SYSTEM_PROMPT, userContent);
    return Response.json(result);
  } catch (err) {
    console.error("Journal summary error", err);
    return Response.json({ error: "Couldn't summarize your journal right now." }, { status: 502 });
  }
}
