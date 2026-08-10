import { NextResponse } from "next/server";
import { verifyRequestToken, adminAvailable } from "@/lib/firebase/admin";
import { groqComplete, groqAvailable } from "@/lib/ai/groq";
import { checkRateLimit } from "@/lib/rateLimit";
import type { Medication } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!adminAvailable) {
    return NextResponse.json({ error: "Server admin not available" }, { status: 503 });
  }

  const token = await verifyRequestToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = checkRateLimit(`interactions:${token.uid}`, 10, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  if (!groqAvailable()) {
    return NextResponse.json({ error: "Groq API not configured" }, { status: 503 });
  }

  try {
    const { medications } = (await req.json()) as { medications: Medication[] };
    if (!medications || medications.length < 2) {
      return NextResponse.json({
        hasInteractions: false,
        interactions: [],
        disclaimer: "At least 2 active medications are required to check for interactions.",
      });
    }

    const medListStr = medications.map((m) => `${m.name} (${m.dosage ?? "dosage unstated"})`).join(", ");

    const prompt = `You are a clinical information assistant. Check for potential interactions between these active medications: ${medListStr}.
Return STRICT JSON matching this schema with no markdown fences:
{
  "hasInteractions": boolean,
  "interactions": [
    {
      "medicationA": string,
      "medicationB": string,
      "severity": "mild" | "moderate" | "severe",
      "description": string,
      "recommendation": string
    }
  ],
  "disclaimer": "This is AI-generated general interaction information, not a substitute for professional pharmacy or medical advice."
}
If no known clinical interactions exist between the listed medications, set hasInteractions to false and return an empty array for interactions.`;

    const raw = await groqComplete([{ role: "user", content: prompt }]);
    const cleanJson = raw.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
    const data = JSON.parse(cleanJson);

    return NextResponse.json(data);
  } catch (err) {
    console.error("Interaction check error:", err);
    return NextResponse.json({ error: "Failed to check interactions." }, { status: 500 });
  }
}
