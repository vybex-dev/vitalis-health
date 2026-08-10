"use client";

import { Card } from "@/components/ui/Card";
import type { JournalEntry } from "@/types";

const MOOD_COLORS: Record<number, string> = {
  1: "bg-alert/80",
  2: "bg-amber/80",
  3: "bg-amber-light border border-amber/40",
  4: "bg-sage/70",
  5: "bg-sage",
};

export function MoodHeatmap({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) return null;

  // Build grid for last 60 days
  const today = new Date();
  const days: { dateStr: string; entry?: JournalEntry }[] = [];

  const entryMap = new Map<string, JournalEntry>();
  entries.forEach((e) => entryMap.set(e.date, e));

  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({
      dateStr,
      entry: entryMap.get(dateStr),
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-display text-sm font-semibold text-ink">Mood Calendar (Last 60 days)</h3>
        <div className="flex items-center gap-1.5 text-[10px] text-ink-soft">
          <span>Low</span>
          <span className="size-2.5 rounded bg-alert/80" />
          <span className="size-2.5 rounded bg-amber/80" />
          <span className="size-2.5 rounded bg-amber-light border border-amber/40" />
          <span className="size-2.5 rounded bg-sage/70" />
          <span className="size-2.5 rounded bg-sage" />
          <span>Great</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-start">
        {days.map((day) => (
          <div
            key={day.dateStr}
            title={
              day.entry
                ? `${day.dateStr}: Mood ${day.entry.mood}/5 ${
                    day.entry.symptoms.length ? `(${day.entry.symptoms.join(", ")})` : ""
                  }`
                : `${day.dateStr}: No entry`
            }
            className={`size-4 sm:size-5 rounded transition-transform hover:scale-125 ${
              day.entry ? MOOD_COLORS[day.entry.mood] : "bg-porcelain-2"
            }`}
          />
        ))}
      </div>
    </Card>
  );
}
