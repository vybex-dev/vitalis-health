"use client";

import { Flame } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { VitalReading, JournalEntry } from "@/types";

function computeStreak(vitals: VitalReading[], journal: JournalEntry[]) {
  const dates = new Set<string>();

  vitals.forEach((v) => {
    dates.add(new Date(v.recordedAt).toISOString().split("T")[0]);
  });

  journal.forEach((j) => {
    dates.add(j.date);
  });

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    if (dates.has(dateStr)) {
      streak++;
    } else if (i === 0) {
      // If nothing logged today yet, don't break streak from yesterday
      continue;
    } else {
      break;
    }
  }

  // Get status for last 7 days (Mon-Sun or relative 7 days)
  const last7Days: { dayName: string; logged: boolean; isToday: boolean }[] = [];
  const days = ["S", "M", "T", "W", "T", "F", "S"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    last7Days.push({
      dayName: days[d.getDay()],
      logged: dates.has(dateStr),
      isToday: i === 0,
    });
  }

  return { streak, last7Days };
}

export function StreakCard({
  vitals,
  journal,
}: {
  vitals: VitalReading[];
  journal: JournalEntry[];
}) {
  const { streak, last7Days } = computeStreak(vitals, journal);

  return (
    <Card className="flex items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-3.5">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-coral-light text-coral">
          <Flame className="size-6 animate-pulse-slow" />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-data text-2xl font-semibold text-ink">{streak}</span>
            <span className="text-xs font-medium text-ink-soft uppercase tracking-wide">
              Day streak
            </span>
          </div>
          <p className="text-xs text-ink-soft">
            {streak > 0 ? "Keep logging daily to build your habit!" : "Log a vital or journal today!"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {last7Days.map((d, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-ink-soft">{d.dayName}</span>
            <div
              className={`size-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                d.logged
                  ? "bg-sage text-white"
                  : d.isToday
                  ? "border-2 border-dashed border-coral text-coral"
                  : "bg-porcelain-2 text-ink-soft"
              }`}
            >
              {d.logged ? "✓" : ""}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
