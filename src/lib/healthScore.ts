import type { VitalReading, JournalEntry, Medication } from "@/types";
import type { HealthScore } from "@/types";

/**
 * A deliberately simple, transparent heuristic — NOT a clinical score.
 * It rewards recent logging, readings inside typical healthy ranges, and
 * decent mood/sleep, and nudges the label down when readings fall outside
 * typical ranges. Every factor is surfaced so it never feels like a black
 * box.
 */
export function computeHealthScore(
  vitals: VitalReading[],
  journal: JournalEntry[],
  medications: Medication[]
): HealthScore {
  const factors: string[] = [];
  let score = 72; // neutral baseline

  const recentVitals = vitals.filter(
    (v) => Date.now() - new Date(v.recordedAt).getTime() < 7 * 24 * 60 * 60 * 1000
  );

  if (recentVitals.length === 0) {
    factors.push("No vitals logged this week yet");
    score -= 8;
  } else {
    factors.push(`${recentVitals.length} vitals logged this week`);
    score += Math.min(10, recentVitals.length);
  }

  const hr = recentVitals.find((v) => v.type === "heart_rate");
  if (hr) {
    if (hr.value >= 60 && hr.value <= 100) {
      factors.push("Resting heart rate in typical range");
      score += 5;
    } else {
      factors.push("Recent heart rate reading outside typical range");
      score -= 6;
    }
  }

  const bp = recentVitals.find((v) => v.type === "blood_pressure");
  if (bp) {
    if (bp.value < 130 && (bp.secondaryValue ?? 0) < 85) {
      factors.push("Blood pressure looks typical");
      score += 5;
    } else {
      factors.push("Recent blood pressure reading worth a look");
      score -= 6;
    }
  }

  const sleep = recentVitals.filter((v) => v.type === "sleep");
  if (sleep.length) {
    const avg = sleep.reduce((s, v) => s + v.value, 0) / sleep.length;
    if (avg >= 7) {
      factors.push("Averaging healthy sleep this week");
      score += 5;
    } else {
      factors.push("Sleep has been running short this week");
      score -= 5;
    }
  }

  const recentMood = journal.filter(
    (j) => Date.now() - new Date(j.date).getTime() < 7 * 24 * 60 * 60 * 1000
  );
  if (recentMood.length) {
    const avgMood = recentMood.reduce((s, j) => s + j.mood, 0) / recentMood.length;
    if (avgMood >= 3.5) {
      factors.push("Mood has been steady or good");
      score += 5;
    } else if (avgMood <= 2) {
      factors.push("Mood has been low lately");
      score -= 8;
    }
  }

  const activeMeds = medications.filter((m) => m.active);
  if (activeMeds.length) {
    factors.push(`${activeMeds.length} active medication${activeMeds.length > 1 ? "s" : ""} tracked`);
  }

  score = Math.max(20, Math.min(98, Math.round(score)));

  let label: HealthScore["label"] = "good";
  if (score >= 85) label = "great";
  else if (score >= 65) label = "good";
  else if (score >= 45) label = "fair";
  else label = "needs_attention";

  return { score, label, factors: factors.slice(0, 4) };
}
