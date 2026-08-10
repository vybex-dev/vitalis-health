// Temporary diagnostics endpoint — remove after debugging!
// Visit /api/debug on your Vercel deployment to see which subsystems are failing.
export const runtime = "nodejs";

export async function GET() {
  const report: Record<string, unknown> = {};

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const privateKey = rawKey.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");

  report.firebase_admin = {
    FIREBASE_PROJECT_ID: projectId ? "set" : "MISSING",
    FIREBASE_CLIENT_EMAIL: clientEmail ? "set" : "MISSING",
    FIREBASE_PRIVATE_KEY_raw_length: rawKey.length,
    FIREBASE_PRIVATE_KEY_parsed_length: privateKey.length,
    starts_with_begin: privateKey.startsWith("-----BEGIN PRIVATE KEY-----"),
    ends_with_end: privateKey.trimEnd().endsWith("-----END PRIVATE KEY-----"),
  };

  try {
    const { getApps, initializeApp, cert } = await import("firebase-admin/app");
    const { getAuth } = await import("firebase-admin/auth");
    const existing = getApps().find((a) => a.name === "debug-probe");
    const adminApp = existing ?? initializeApp(
      { credential: cert({ projectId: projectId!, clientEmail: clientEmail!, privateKey }) },
      "debug-probe"
    );
    const auth = getAuth(adminApp);
    await auth.listUsers(1);
    report.firebase_admin_test = "OK - connected";
  } catch (err: unknown) {
    report.firebase_admin_test = "ERROR: " + (err instanceof Error ? err.message : String(err));
  }

  const groqKey = process.env.GROQ_API_KEY;
  report.groq_key = groqKey ? "set" : "MISSING";
  if (groqKey) {
    try {
      const Groq = (await import("groq-sdk")).default;
      const groq = new Groq({ apiKey: groqKey });
      const res = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "say ok" }],
        max_tokens: 5,
      });
      report.groq_ping = "OK: " + (res.choices[0]?.message?.content ?? "");
    } catch (err: unknown) {
      report.groq_ping = "ERROR: " + (err instanceof Error ? err.message : String(err));
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  report.gemini_key = geminiKey ? "set" : "MISSING";
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const result = await model.generateContent("say ok");
      report.gemini_ping = "OK: " + result.response.text().slice(0, 40);
    } catch (err: unknown) {
      report.gemini_ping = "ERROR: " + (err instanceof Error ? err.message : String(err));
    }
  }

  report.runtime = {
    node_version: process.version,
    is_vercel: Boolean(process.env.VERCEL),
    vercel_region: process.env.VERCEL_REGION ?? "local",
  };

  return Response.json(report, { status: 200 });
}
