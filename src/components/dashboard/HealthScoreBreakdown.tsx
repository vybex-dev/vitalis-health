"use client";

import { ProgressRing } from "@/components/ui/ProgressRing";
import { Card } from "@/components/ui/Card";
import type { VitalReading, JournalEntry, Medication } from "@/types";

interface CategoryScore {
  label: string;
  score: number;
  color: string;
  description: string;
}

function computeCategoryScores(
  vitals: VitalReading[],
  journal: JournalEntry[],
  medications: Medication[]
): CategoryScore[] {
  const week = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const recentVitals = vitals.filter((v) => now - new Date(v.recordedAt).getTime() < week);

  // Vitals score
  const vitalScore = Math.min(100, recentVitals.length * 14);
  const hr = recentVitals.find((v) => v.type === "heart_rate");
  const bp = recentVitals.find((v) => v.type === "blood_pressure");
  let vitalsScore = vitalScore;
  if (hr && hr.value >= 60 && hr.value <= 100) vitalsScore = Math.min(100, vitalsScore + 10);
  if (bp && bp.value < 130) vitalsScore = Math.min(100, vitalsScore + 10);

  // Sleep score
  const sleepReadings = recentVitals.filter((v) => v.type === "sleep");
  let sleepScore = 40;
  if (sleepReadings.length > 0) {
    const avg = sleepReadings.reduce((s, v) => s + v.value, 0) / sleepReadings.length;
    sleepScore = avg >= 7 ? 90 : avg >= 6 ? 70 : avg >= 5 ? 50 : 30;
  }

  // Mood score
  const recentJournal = journal.filter((j) => now - new Date(j.date).getTime() < week);
  let moodScore = 50;
  if (recentJournal.length > 0) {
    const avgMood = recentJournal.reduce((s, j) => s + j.mood, 0) / recentJournal.length;
    moodScore = Math.round((avgMood / 5) * 100);
  }

  // Medication adherence score
  const activeMeds = medications.filter((m) => m.active);
  let adherenceScore = 70;
  if (activeMeds.length > 0) {
    const takenToday = activeMeds.filter((m) => {
      if (!m.lastTakenAt) return false;
      return new Date(m.lastTakenAt).toDateString() === new Date().toDateString();
    }).length;
    adherenceScore = activeMeds.length > 0 ? Math.round((takenToday / activeMeds.length) * 100) : 70;
  }

  // Activity score (steps)
  const steps = recentVitals.filter((v) => v.type === "steps");
  let activityScore = 40;
  if (steps.length > 0) {
    const avgSteps = steps.reduce((s, v) => s + v.value, 0) / steps.length;
    activityScore = avgSteps >= 10000 ? 95 : avgSteps >= 7500 ? 80 : avgSteps >= 5000 ? 65 : 40;
  }

  return [
    {
      label: "Vitals",
      score: Math.round(Math.min(100, vitalsScore)),
      color: "var(--color-coral)",
      description: `${recentVitals.length} reading${recentVitals.length !== 1 ? "s" : ""} this week`,
    },
    {
      label: "Sleep",
      score: sleepScore,
      color: "var(--color-sage)",
      description: sleepReadings.length > 0
        ? `Avg ${(sleepReadings.reduce((s, v) => s + v.value, 0) / sleepReadings.length).toFixed(1)} hrs`
        : "Not logged",
    },
    {
      label: "Mood",
      score: moodScore,
      color: "var(--color-amber)",
      description: recentJournal.length > 0
        ? `${recentJournal.length} entr${recentJournal.length !== 1 ? "ies" : "y"} this week`
        : "Not logged",
    },
    {
      label: "Meds",
      score: adherenceScore,
      color: "var(--color-ink-2)",
      description: activeMeds.length > 0 ? `${activeMeds.length} active` : "None tracked",
    },
    {
      label: "Activity",
      score: activityScore,
      color: "var(--color-teal-deep-2)",
      description: steps.length > 0
        ? `Avg ${Math.round(steps.reduce((s, v) => s + v.value, 0) / steps.length).toLocaleString()} steps`
        : "Not logged",
    },
  ];
}

export function HealthScoreBreakdown({
  vitals,
  journal,
  medications,
}: {
  vitals: VitalReading[];
  journal: JournalEntry[];
  medications: Medication[];
}) {
  const categories = computeCategoryScores(vitals, journal, medications);

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-display text-sm font-semibold text-ink">Score breakdown</h2>
      <div className="grid grid-cols-5 gap-2">
        {categories.map((cat) => (
          <div key={cat.label} className="flex flex-col items-center gap-1.5">
            <ProgressRing
              value={cat.score}
              size={56}
              strokeWidth={6}
              color={cat.color}
              label={`${cat.score}`}
            />
            <p className="text-center text-[10px] font-semibold text-ink-soft uppercase tracking-wide">
              {cat.label}
            </p>
            <p className="text-center text-[9px] text-ink-soft leading-tight">
              {cat.description}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
