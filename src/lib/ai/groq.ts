import Groq from "groq-sdk";

let client: Groq | null = null;

export function groqAvailable() {
  return Boolean(process.env.GROQ_API_KEY);
}

function getClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set. Add it to your environment variables.");
  }
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

export const GROQ_MODEL = "llama-3.3-70b-versatile";

export interface SimpleMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Streams a chat completion from Groq as an async iterable of text deltas.
 * Groq's Llama 3.3 70B is used here for its very low latency, which is what
 * makes the "Quick" copilot mode feel instant.
 */
export async function* streamGroqChat(messages: SimpleMessage[]) {
  const groq = getClient();
  const stream = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    stream: true,
    temperature: 0.4,
    max_tokens: 900,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/** Non-streaming helper, used for short structured tasks if ever needed. */
export async function groqComplete(messages: SimpleMessage[]) {
  const groq = getClient();
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 700,
  });
  return completion.choices[0]?.message?.content ?? "";
}
