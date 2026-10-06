import { z } from "zod";
import { verifyRequestToken, adminAvailable } from "@/lib/firebase/admin";
import { generateGeminiJSON, geminiAvailable } from "@/lib/ai/gemini";
import { EXPLAIN_REPORT_SYSTEM_PROMPT } from "@/lib/ai/systemPrompts";
import { languageByCode, LANGUAGES } from "@/lib/ai/languages";
import { checkRateLimit } from "@/lib/rateLimit";
import { anonIpLimited } from "@/lib/api/guard";
import type { ReportExplanation } from "@/types";

export const runtime = "nodejs";

const Schema = z.object({
  headline: z.string().min(1).max(400),
  keyPoints: z.array(z.string().max(400)).max(5).default([]),
  items: z
    .array(
      z.object({
        testName: z.string().max(120),
        whatItMeasures: z.string().max(400),
        whatItMeans: z.string().max(600),
        questionsToAsk: z.array(z.string().max(300)).max(3).default([]),
      }),
    )
    .max(10)
    .default([]),
  questionsForDoctor: z.array(z.string().max(300)).max(6).default([]),
  whenToSeekCareSooner: z.string().max(500).default(""),
});

interface Body {
  labValues: { testName: string; value: string; unit?: string; referenceRange?: string; flag: string }[];
  language?: string;
  readingLevel?: "simple" | "standard";
}

export async function POST(request: Request) {
  if (!adminAvailable) {
    return Response.json({ error: "Server isn't configured yet (Firebase Admin credentials missing). See README.md." }, { status: 503 });
  }
  const auth = await verifyRequestToken(request);
  if (!auth) return Response.json({ error: "Sign in required." }, { status: 401 });

  const anonBlock = anonIpLimited(request, auth, "explain");
  if (anonBlock) return anonBlock;

  const { allowed, resetInMs } = checkRateLimit(`explain:${auth.uid}`, 10, 30 * 60 * 1000);
  if (!allowed) {
    return Response.json({ error: `Try again in ${Math.ceil((resetInMs ?? 0) / 60000)} min.` }, { status: 429 });
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

  const values = (Array.isArray(body.labValues) ? body.labValues : [])
    .filter((v) => v && typeof v.testName === "string" && v.value !== undefined)
    .slice(0, 60)
    .map((v) => ({
      testName: String(v.testName).slice(0, 120),
      value: String(v.value).slice(0, 40),
      unit: v.unit ? String(v.unit).slice(0, 30) : undefined,
      referenceRange: v.referenceRange ? String(v.referenceRange).slice(0, 60) : undefined,
      flag: ["low", "normal", "high", "unknown"].includes(v.flag) ? v.flag : "unknown",
    }));
  if (values.length === 0) return Response.json({ error: "No lab values to explain." }, { status: 400 });

  const lang = LANGUAGES.some((l) => l.code === body.language) ? languageByCode(body.language) : languageByCode("en");
  const readingLevel = body.readingLevel === "standard" ? "standard" : "simple";

  try {
    const raw = await generateGeminiJSON<unknown>(
      EXPLAIN_REPORT_SYSTEM_PROMPT,
      JSON.stringify({ language: `${lang.english} (${lang.code})`, readingLevel, labValues: values }),
      { maxOutputTokens: 8192, temperature: 0.3 },
    );
    const parsed = Schema.parse(raw);

    // Belt and braces: only explain tests that really were flagged low/high in the input.
    const flagged = new Set(values.filter((v) => v.flag === "low" || v.flag === "high").map((v) => v.testName.toLowerCase()));
    const explanation: ReportExplanation = {
      language: lang.code,
      readingLevel,
      ...parsed,
      items: parsed.items.filter((i) => flagged.has(i.testName.toLowerCase())),
      generatedAt: new Date().toISOString(),
    };
    return Response.json(explanation);
  } catch (err) {
    console.error("Explain report error", err);
    return Response.json({ error: "Couldn't generate the explanation right now. Please try again." }, { status: 502 });
  }
}
