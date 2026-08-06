import { verifyRequestToken, adminAvailable } from "@/lib/firebase/admin";
import { streamGroqChat, groqAvailable, type SimpleMessage } from "@/lib/ai/groq";
import { COPILOT_SYSTEM_PROMPT } from "@/lib/ai/systemPrompts";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

interface ChatRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  context?: string; // short plain-text summary of recent vitals/meds/profile
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

  const { allowed, resetInMs } = checkRateLimit(`chat:${auth.uid}`, 30, 10 * 60 * 1000);
  if (!allowed) {
    return Response.json(
      { error: `You're sending messages a bit fast. Try again in ${Math.ceil((resetInMs ?? 0) / 1000)}s.` },
      { status: 429 }
    );
  }

  if (!groqAvailable()) {
    return Response.json({ error: "GROQ_API_KEY is not configured on the server." }, { status: 503 });
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
    ? `${COPILOT_SYSTEM_PROMPT}\n\nContext the user has logged in Vitalis (use only if relevant, never invent additional data):\n${context}`
    : COPILOT_SYSTEM_PROMPT;

  const groqMessages: SimpleMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-16).map((m) => ({ role: m.role, content: m.content }) as SimpleMessage),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamGroqChat(groqMessages)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode("\n\n[The copilot hit an error generating a response. Please try again.]")
        );
        console.error("Groq stream error", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
