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
    text = text.replace(/^```(json)?\s*/i, "").replace(/```\s*$/, "").trim();
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

export const GEMINI_MODEL = "gemini-1.5-flash";

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

/** Streams a chat completion from Gemini 2.5 Flash for the "Deep analysis" copilot mode. */
export async function* streamGeminiChat(messages: SimpleMessage[]) {
  const genAI = getClient();
  const { systemInstruction, history } = toGeminiHistory(messages);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
  });

  const last = history[history.length - 1];
  const priorHistory = history.slice(0, -1);
  const chat = model.startChat({ history: priorHistory });
  const result = await chat.sendMessageStream(last.parts[0].text ?? "");

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

/**
 * Calls Gemini 2.5 Flash with an inline file (image or PDF, base64) plus a
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
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  });
  const result = await model.generateContent([
    { inlineData: { data: fileBase64, mimeType } },
    { text: promptText },
  ]);
  const text = result.response.text();
  return safeJSONParse<T>(text);
}

/**
 * Calls Gemini 2.5 Flash and parses the response as JSON. Used for the
 * symptom checker and insight generator, which both request strict JSON
 * output via their system prompts.
 */
export async function generateGeminiJSON<T>(
  systemInstruction: string,
  userContent: string,
): Promise<T> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  });
  const result = await model.generateContent(userContent);
  const text = result.response.text();
  return safeJSONParse<T>(text);
}
