// src/lib/visitBrief.ts: Builds the doctor visit brief.
import { summarizeVitals, type VitalTrend } from "@/lib/trends";
import type {
  JournalEntry,
  LabResult,
  Medication,
  SymptomCheck,
  UserProfile,
  VitalReading,
} from "@/types";

// The "Visit Prep" brief: everything a clinician needs from the last month,
// on one page. Assembly is 100% deterministic — the AI is only ever asked to
// turn these facts into good QUESTIONS (see /api/visit-prep/questions); it
// never produces the facts themselves.

export interface BriefLab {
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag: "low" | "high";
  recordedAt: string;
  previousValue?: string;
}

export interface VisitBrief {
  generatedAt: string;
  reasonForVisit?: string;
  patient: {
    name: string;
    age?: number;
    sex?: string;
    conditions: string[];
    allergies: string[];
    emergencyContact?: string;
  };
  medications: { name: string; dosage: string; frequency: string; instructions?: string }[];
  vitals: VitalTrend[];
  flaggedLabs: BriefLab[];
  recentSymptomChecks: { date: string; bodyRegion: string; urgency: string; summary: string }[];
  mood: { entries: number; averageMood: number; topSymptoms: { symptom: string; count: number }[] } | null;
  /** Data-derived talking points. Pure rules — no model involved. */
  discussionPoints: string[];
}

const DAY_MS = 86_400_000;

export function ageFromDob(dob: string | null | undefined, now: Date): number | undefined {
  if (!dob) return undefined;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return undefined;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : undefined;
}

/** Latest result per test name; keeps only the ones currently flagged low/high. */
export function latestFlaggedLabs(labs: LabResult[]): BriefLab[] {
  const byTest = new Map<string, LabResult[]>();
  for (const l of labs) {
    const key = l.testName.trim().toLowerCase();
    byTest.set(key, [...(byTest.get(key) ?? []), l]);
  }
  const out: BriefLab[] = [];
  for (const list of byTest.values()) {
    const sorted = [...list].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );
    const latest = sorted[0];
    if (latest.flag === "low" || latest.flag === "high") {
      out.push({
        testName: latest.testName,
        value: latest.value,
        unit: latest.unit,
        referenceRange: latest.referenceRange,
        flag: latest.flag,
        recordedAt: latest.recordedAt,
        previousValue: sorted[1]?.value,
      });
    }
  }
  return out.sort((a, b) => a.testName.localeCompare(b.testName));
}

const FREQ_LABEL: Record<Medication["frequency"], string> = {
  once_daily: "once daily",
  twice_daily: "twice daily",
  three_times_daily: "three times daily",
  as_needed: "as needed",
  weekly: "weekly",
  custom: "custom schedule",
};

export function buildVisitBrief(
  input: {
    profile: UserProfile | null;
    vitals: VitalReading[];
    medications: Medication[];
    labResults: LabResult[];
    symptomChecks: SymptomCheck[];
    journal: JournalEntry[];
    reasonForVisit?: string;
  },
  now: Date,
): VisitBrief {
  const { profile } = input;
  const nowMs = now.getTime();

  const vitals = summarizeVitals(input.vitals, { days: 30, now: nowMs });
  const flaggedLabs = latestFlaggedLabs(input.labResults);

  const recentSymptomChecks = input.symptomChecks
    .filter((c) => nowMs - new Date(c.createdAt).getTime() <= 30 * DAY_MS)
    .slice(0, 5)
    .map((c) => ({
      date: c.createdAt.slice(0, 10),
      bodyRegion: c.bodyRegion,
      urgency: c.assessment.urgency,
      summary: c.assessment.summary,
    }));

  const recentJournal = input.journal.filter((j) => nowMs - new Date(j.date).getTime() <= 30 * DAY_MS);
  let mood: VisitBrief["mood"] = null;
  if (recentJournal.length > 0) {
    const symptomCounts = new Map<string, number>();
    for (const j of recentJournal) {
      for (const s of j.symptoms ?? []) {
        const key = s.trim().toLowerCase();
        if (key) symptomCounts.set(key, (symptomCounts.get(key) ?? 0) + 1);
      }
    }
    mood = {
      entries: recentJournal.length,
      averageMood: Math.round((recentJournal.reduce((a, j) => a + j.mood, 0) / recentJournal.length) * 10) / 10,
      topSymptoms: [...symptomCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([symptom, count]) => ({ symptom, count })),
    };
  }

  const medications = input.medications
    .filter((m) => m.active)
    .map((m) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: FREQ_LABEL[m.frequency] ?? m.frequency,
      instructions: m.instructions || undefined,
    }));

  // ---- deterministic discussion points
  const points: string[] = [];
  for (const v of vitals) {
    const reading =
      v.type === "blood_pressure" && v.latestSecondary
        ? `${v.latest}/${v.latestSecondary} ${v.unit}`
        : `${v.latest} ${v.unit}`;
    if (v.direction === "up" || v.direction === "down") {
      points.push(
        `${v.label} has trended ${v.direction === "up" ? "up" : "down"} about ${Math.abs(v.changePct ?? 0)}% over the last 30 days (latest ${reading}).`,
      );
    }
    if (v.hasRange && v.outOfRange >= 2) {
      points.push(`${v.label}: ${v.outOfRange} of ${v.count} readings were outside the typical range.`);
    }
  }
  for (const l of flaggedLabs) {
    const prev = l.previousValue ? ` (previously ${l.previousValue})` : "";
    points.push(`${l.testName} was flagged ${l.flag}: ${l.value}${l.unit ? " " + l.unit : ""}${prev}.`);
  }
  for (const s of mood?.topSymptoms ?? []) {
    if (s.count >= 3) points.push(`"${s.symptom}" was logged ${s.count} times in the last 30 days.`);
  }
  if (mood && mood.averageMood <= 2.5) {
    points.push(`Average mood over the last 30 days was low (${mood.averageMood}/5).`);
  }
  for (const c of recentSymptomChecks) {
    if (c.urgency === "prompt" || c.urgency === "emergency") {
      points.push(`A recent symptom check (${c.bodyRegion}, ${c.date}) was rated "${c.urgency}".`);
    }
  }

  const ec = profile?.emergencyContact;
  return {
    generatedAt: now.toISOString(),
    reasonForVisit: input.reasonForVisit?.trim() || undefined,
    patient: {
      name: profile?.displayName || "Patient",
      age: ageFromDob(profile?.dob, now),
      sex: profile?.sex && profile.sex !== "prefer_not_to_say" ? profile.sex : undefined,
      conditions: profile?.conditions ?? [],
      allergies: profile?.allergies ?? [],
      emergencyContact: ec?.phone ? `${ec.name || "Contact"} (${ec.relation || "—"}) ${ec.phone}` : undefined,
    },
    medications,
    vitals,
    flaggedLabs,
    recentSymptomChecks,
    mood,
    discussionPoints: points.slice(0, 10),
  };
}

/** Plain-text version — easy to paste into WhatsApp / email / a patient portal. */
export function briefToText(b: VisitBrief, questions: string[] = []): string {
  const L: string[] = [];
  L.push(`VISIT BRIEF — ${b.patient.name}${b.patient.age !== undefined ? `, ${b.patient.age}y` : ""}${b.patient.sex ? `, ${b.patient.sex}` : ""}`);
  L.push(`Prepared ${b.generatedAt.slice(0, 10)} with Vitalis (self-reported data, not a medical record)`);
  if (b.reasonForVisit) L.push(`Reason for visit: ${b.reasonForVisit}`);
  L.push("");
  L.push(`Conditions: ${b.patient.conditions.join(", ") || "none listed"}`);
  L.push(`Allergies: ${b.patient.allergies.join(", ") || "none listed"}`);
  L.push("");
  L.push("CURRENT MEDICATIONS");
  if (b.medications.length === 0) L.push("- none listed");
  for (const m of b.medications) L.push(`- ${m.name} ${m.dosage}, ${m.frequency}${m.instructions ? ` (${m.instructions})` : ""}`);
  L.push("");
  L.push("VITALS — LAST 30 DAYS");
  if (b.vitals.length === 0) L.push("- no readings logged");
  for (const v of b.vitals) {
    const latest = v.type === "blood_pressure" && v.latestSecondary ? `${v.latest}/${v.latestSecondary}` : `${v.latest}`;
    L.push(`- ${v.label}: latest ${latest} ${v.unit}; avg ${v.mean}, range ${v.min}–${v.max}, ${v.count} readings, trend ${v.direction}`);
  }
  L.push("");
  L.push("FLAGGED LAB RESULTS");
  if (b.flaggedLabs.length === 0) L.push("- none flagged");
  for (const l of b.flaggedLabs) L.push(`- ${l.testName}: ${l.value}${l.unit ? " " + l.unit : ""} (${l.flag}; ref ${l.referenceRange || "n/a"})`);
  if (b.discussionPoints.length) {
    L.push("");
    L.push("WORTH DISCUSSING");
    for (const p of b.discussionPoints) L.push(`- ${p}`);
  }
  if (questions.length) {
    L.push("");
    L.push("QUESTIONS TO ASK");
    questions.forEach((q, i) => L.push(`${i + 1}. ${q}`));
  }
  return L.join("\n");
}
