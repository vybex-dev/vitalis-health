import { verifyRequestToken, adminAvailable } from "@/lib/firebase/admin";
import { streamGeminiChat, geminiAvailable, type SimpleMessage } from "@/lib/ai/gemini";
import { COPILOT_SYSTEM_PROMPT } from "@/lib/ai/systemPrompts";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

interface ChatRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  context?: string;
}

export async function POST(request: Request) {
  if (!adminAvailable) {
    return Response.json(
      { error: "Server isn't configured yet (Firebase Admin credentials missing). See README.md." },
      { status: 503 }
    );
  }
  const auth = await verifyRequestToken(request);
  if (!auth) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const { allowed, resetInMs } = checkRateLimit(`chat-deep:${auth.uid}`, 15, 10 * 60 * 1000);
  if (!allowed) {
    return Response.json(
      { error: `Deep analysis is rate-limited. Try again in ${Math.ceil((resetInMs ?? 0) / 1000)}s.` },
      { status: 429 }
    );
  }

  if (!geminiAvailable()) {
    return Response.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 503 });
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { messages, context } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
  }

  const systemPrompt = context
    ? `${COPILOT_SYSTEM_PROMPT}\n\nYou are in "Deep analysis" mode: take extra care to reason through the user's logged context below before answering, and be more thorough than a quick reply.\n\nContext the user has logged in Vitalis (use only if relevant, never invent additional data):\n${context}`
    : `${COPILOT_SYSTEM_PROMPT}\n\nYou are in "Deep analysis" mode: be thorough and reason carefully before answering.`;

  const geminiMessages: SimpleMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-16).map((m) => ({ role: m.role, content: m.content }) as SimpleMessage),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamGeminiChat(geminiMessages)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode("\n\n[The copilot hit an error generating a response. Please try again.]")
        );
        console.error("Gemini stream error", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
