import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
/**
 * Gemini's `responseMimeType: "application/json"` mode is reliable but not
 * airtight — long generations can get cut off at the output token limit
 * mid-string, and very rarely a stray markdown fence slips through. This
 * strips fences if present, and if parsing still fails, trims back to the
 * last complete `}` (recovering a truncated-but-otherwise-valid response)
 * before giving up.
 */
function safeJSONParse<T>(raw: string): T {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text
      .replace(/^```(json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
  }
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    const lastBrace = text.lastIndexOf("}");
    if (lastBrace !== -1) {
      try {
        return JSON.parse(text.slice(0, lastBrace + 1)) as T;
      } catch {
        // fall through to original error below
      }
    }
    throw err;
  }
}

let client: GoogleGenerativeAI | null = null;

export function geminiAvailable() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your environment variables.",
    );
  }
  if (!client) client = new GoogleGenerativeAI(apiKey);
  return client;
}

// Override with GEMINI_MODEL in the environment (e.g. "gemini-3.8-flash") without a code change.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// If the primary model is unavailable (404), rate-limited (429) or overloaded (5xx), try the next one.
// Override with GEMINI_FALLBACK_MODELS (comma-separated). Key/permission errors (401/403) are never retried:
// another model won't fix a bad key.
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.7-flash,gemini-3.5-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export function modelChain(): string[] {
  return [GEMINI_MODEL, ...FALLBACK_MODELS.filter((m) => m !== GEMINI_MODEL)];
}

/** Pulls the HTTP status out of the SDK's error (it exposes `.status`, and also embeds "[429 ...]" in the message). */
export function geminiErrorStatus(err: unknown): number | undefined {
  const e = err as { status?: number; message?: string };
  if (typeof e?.status === "number") return e.status;
  const m = /\[(\d{3})\s/.exec(e?.message ?? "");
  return m ? Number(m[1]) : undefined;
}

function isKeyProblem(err: unknown): boolean {
  const status = geminiErrorStatus(err);
  const msg = (err as Error)?.message ?? "";
  return status === 401 || status === 403 || (status === 400 && /api key/i.test(msg));
}

/** Short, user-safe explanation of a Gemini failure (the full error still goes to server logs). */
export function describeGeminiError(err: unknown): { status: number; message: string } {
  const status = geminiErrorStatus(err);
  if (isKeyProblem(err)) {
    return { status: 502, message: "The AI service rejected the server's API key. The site owner needs to check GEMINI_API_KEY." };
  }
  if (status === 429) {
    return { status: 429, message: "The AI service is at its rate limit right now. Please wait a minute and try again." };
  }
  if (status === 404) {
    return { status: 502, message: "The configured AI model isn't available for this key. The site owner needs to check GEMINI_MODEL." };
  }
  if (status && status >= 500) {
    return { status: 502, message: "The AI service is temporarily overloaded. Please try again in a moment." };
  }
  return { status: 502, message: "Couldn't reach the AI service. Please try again." };
}

export async function withModelFallback<T>(run: (modelName: string) => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (const name of modelChain()) {
    try {
      return await run(name);
    } catch (err) {
      lastErr = err;
      console.error(`Gemini call failed on ${name} (status ${geminiErrorStatus(err) ?? "n/a"}):`, (err as Error)?.message);
      if (isKeyProblem(err)) throw err;
      if (err instanceof SyntaxError) throw err; // bad JSON from the model, not an availability problem
    }
  }
  throw lastErr;
}

export interface SimpleMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function toGeminiHistory(messages: SimpleMessage[]): {
  systemInstruction?: string;
  history: Content[];
} {
  const systemInstruction = messages.find((m) => m.role === "system")?.content;
  const history: Content[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  return { systemInstruction, history };
}

/** Streams a chat completion from Gemini (see GEMINI_MODEL) for the "Deep analysis" copilot mode. */
export async function* streamGeminiChat(messages: SimpleMessage[]) {
  const genAI = getClient();
  const { systemInstruction, history } = toGeminiHistory(messages);
  const last = history[history.length - 1];
  const priorHistory = history.slice(0, -1);

  let lastErr: unknown;
  for (const name of modelChain()) {
    let yielded = false;
    try {
      const model = genAI.getGenerativeModel({ model: name, systemInstruction });
      const chat = model.startChat({ history: priorHistory });
      const result = await chat.sendMessageStream(last.parts[0].text ?? "");
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yielded = true;
          yield text;
        }
      }
      return;
    } catch (err) {
      lastErr = err;
      console.error(`Gemini stream failed on ${name}:`, (err as Error)?.message);
      if (yielded || isKeyProblem(err)) throw err; // can't switch models mid-answer
    }
  }
  throw lastErr;
}

/**
 * Calls Gemini with an inline file (image or PDF, base64) plus a
 * text instruction, and parses the response as JSON. Used for document
 * extraction (lab reports / prescriptions), which supports Gemini's native
 * multimodal input — no separate OCR step needed.
 */
export async function generateGeminiJSONFromFile<T>(
  systemInstruction: string,
  fileBase64: string,
  mimeType: string,
  promptText: string,
): Promise<T> {
  const genAI = getClient();
  return withModelFallback(async (name) => {
    const model = genAI.getGenerativeModel({
      model: name,
      systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        // Gemini 3.x "thinking" tokens count against this budget, so leave headroom beyond the JSON itself.
        maxOutputTokens: 8192,
      },
    });
    const result = await model.generateContent([
      { inlineData: { data: fileBase64, mimeType } },
      { text: promptText },
    ]);
    return safeJSONParse<T>(result.response.text());
  });
}

/**
 * Calls Gemini and parses the response as JSON. Used for the symptom checker,
 * insights, report explanations and visit-prep questions, which all request
 * strict JSON. Callers that validate with zod should pass T = unknown.
 */
export async function generateGeminiJSON<T>(
  systemInstruction: string,
  userContent: string,
  opts: { maxOutputTokens?: number; temperature?: number } = {},
): Promise<T> {
  const genAI = getClient();
  return withModelFallback(async (name) => {
    const model = genAI.getGenerativeModel({
      model: name,
      systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: opts.temperature ?? 0.3,
        maxOutputTokens: opts.maxOutputTokens ?? 4096,
      },
    });
    const result = await model.generateContent(userContent);
    return safeJSONParse<T>(result.response.text());
  });
}
