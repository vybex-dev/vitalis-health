// src/lib/aiClient.ts: Client-side wrappers for calling the AI API routes.
import type { VitalReading, JournalEntry, SymptomCheck, HealthInsight, DocumentExtraction, ExtractedLabValue, ReadingLevel, ReportExplanation } from "@/types";
import type { VisitBrief } from "@/lib/visitBrief";

async function postJSON<T>(url: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function generateWeeklyInsight(
  token: string,
  vitals: VitalReading[],
  journal: JournalEntry[]
): Promise<Pick<HealthInsight, "summary" | "highlights" | "watchOuts" | "suggestions">> {
  return postJSON("/api/insights/weekly", token, { vitals, journal });
}

export async function runSymptomCheck(
  token: string,
  input: {
    bodyRegion: string;
    symptoms: string[];
    severity: number;
    durationHours: number;
    freeText?: string;
  }
): Promise<SymptomCheck["assessment"]> {
  return postJSON("/api/symptom-check", token, input);
}

export async function summarizeJournal(
  token: string,
  entries: JournalEntry[]
): Promise<{ summary: string; moodTrend: string; recurringSymptoms: string[]; suggestion: string }> {
  return postJSON("/api/journal/summary", token, { entries });
}

export async function extractDocument(
  token: string,
  input: { fileBase64: string; mimeType: string }
): Promise<DocumentExtraction> {
  return postJSON("/api/documents/extract", token, input);
}

export async function explainReport(
  token: string,
  input: { labValues: ExtractedLabValue[]; language: string; readingLevel: ReadingLevel }
): Promise<ReportExplanation> {
  return postJSON("/api/documents/explain", token, input);
}

export async function generateVisitQuestions(
  token: string,
  brief: VisitBrief
): Promise<{ questions: string[]; topicsToRaise: string[] }> {
  return postJSON("/api/visit-prep/questions", token, { brief });
}
