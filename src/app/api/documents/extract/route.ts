import { verifyRequestToken, adminAvailable } from "@/lib/firebase/admin";
import { generateGeminiJSONFromFile, geminiAvailable } from "@/lib/ai/gemini";
import { DOCUMENT_EXTRACTION_SYSTEM_PROMPT } from "@/lib/ai/systemPrompts";
import { checkRateLimit } from "@/lib/rateLimit";
import type { DocumentExtraction, DocumentType } from "@/types";

export const runtime = "nodejs";

interface Body {
  fileBase64: string;
  mimeType: string;
}

const VALID_TYPES: DocumentType[] = ["lab_report", "prescription", "other"];
const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
// Matches the client-side compression budget in lib/fileUpload.ts, plus
// generous headroom for base64 overhead — this is a sanity check, not the
// primary size control (that happens client-side before upload).
const MAX_BASE64_LENGTH = 1_400_000;

export async function POST(request: Request) {
  if (!adminAvailable) {
    return Response.json(
      { error: "Server isn't configured yet (Firebase Admin credentials missing). See README.md." },
      { status: 503 }
    );
  }
  const auth = await verifyRequestToken(request);
  if (!auth) return Response.json({ error: "Sign in required." }, { status: 401 });

  const { allowed, resetInMs } = checkRateLimit(`doc-extract:${auth.uid}`, 15, 30 * 60 * 1000);
  if (!allowed) {
    return Response.json(
      { error: `Too many uploads processed recently. Try again in ${Math.ceil((resetInMs ?? 0) / 60000)} min.` },
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

  if (!body.fileBase64 || !body.mimeType) {
    return Response.json({ error: "Missing file data or mimeType." }, { status: 400 });
  }

  if (!ACCEPTED_MIME.includes(body.mimeType)) {
    return Response.json({ error: "Unsupported file type. Upload a PDF, JPG, PNG, or HEIC file." }, { status: 400 });
  }

  if (body.fileBase64.length > MAX_BASE64_LENGTH) {
    return Response.json({ error: "That file is too large to process." }, { status: 400 });
  }

  try {
    const extraction = await generateGeminiJSONFromFile<DocumentExtraction>(
      DOCUMENT_EXTRACTION_SYSTEM_PROMPT,
      body.fileBase64,
      body.mimeType,
      "Extract this document per your instructions."
    );

    if (!VALID_TYPES.includes(extraction.documentType)) {
      extraction.documentType = "other";
    }
    extraction.labValues = Array.isArray(extraction.labValues) ? extraction.labValues.slice(0, 60) : [];
    extraction.medications = Array.isArray(extraction.medications) ? extraction.medications.slice(0, 20) : [];
    if (!extraction.disclaimer) {
      extraction.disclaimer = "This is an automated transcription — please verify it against the original document.";
    }

    return Response.json(extraction);
  } catch (err) {
    console.error("Document extraction error", err);
    return Response.json(
      { error: "Couldn't read that document right now. Please try again, or enter the details manually." },
      { status: 502 }
    );
  }
}
