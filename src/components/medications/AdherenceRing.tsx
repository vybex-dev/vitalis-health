"use client";

import { ProgressRing } from "@/components/ui/ProgressRing";
import { Card } from "@/components/ui/Card";
import type { Medication } from "@/types";

export function AdherenceRing({ medications }: { medications: Medication[] }) {
  const activeMeds = medications.filter((m) => m.active);

  if (activeMeds.length === 0) return null;

  const todayDate = new Date();
  const today = todayDate.toDateString();
  const takenCount = activeMeds.filter((m) => {
    if (!m.lastTakenAt) return false;
    return new Date(m.lastTakenAt).toDateString() === today;
  }).length;

  const pct = Math.round((takenCount / activeMeds.length) * 100);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(todayDate.getDate() - (6 - i));
    return d;
  });

  const calendarDays = last7Days.map(date => {
    const dateString = date.toDateString();
    const isToday = dateString === today;
    const hasTakenAny = activeMeds.some(m => {
      if (!m.lastTakenAt) return false;
      return new Date(m.lastTakenAt).toDateString() === dateString;
    });
    const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" }).charAt(0);
    return { date, isToday, hasTakenAny, dayLabel };
  });

  return (
    <Card className="flex items-center justify-between p-5 bg-gradient-to-r from-white via-white to-sage-light/30">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-display text-sm font-semibold text-ink">Today&apos;s Adherence</h3>
          <p className="text-xs text-ink-soft mt-0.5">
            {takenCount} of {activeMeds.length} medication{activeMeds.length !== 1 ? "s" : ""} taken today
          </p>
        </div>
        
        <div className="flex items-center gap-1.5">
          {calendarDays.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`size-4 rounded-full ${day.hasTakenAny ? "bg-sage" : "bg-ink/10"} ${day.isToday ? "ring-2 ring-sage ring-offset-1" : ""}`}
              />
              <span className="text-[10px] text-ink-soft font-medium uppercase">{day.dayLabel}</span>
            </div>
          ))}
        </div>
      </div>

      <ProgressRing
        value={pct}
        size={52}
        strokeWidth={6}
        color={pct === 100 ? "var(--color-sage)" : "var(--color-coral)"}
        label={`${pct}%`}
      />
    </Card>
  );
}
