"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { VITAL_META } from "@/types";
import type { VitalReading, VitalType } from "@/types";
import { formatDate } from "@/lib/utils";

export function VitalsChart({ type, readings }: { type: VitalType; readings: VitalReading[] }) {
  const meta = VITAL_META[type];
  const data = [...readings]
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((r) => ({
      date: formatDate(r.recordedAt),
      value: r.value,
      secondary: r.secondaryValue ?? undefined,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border-strong text-sm text-ink-soft">
        No {meta.label.toLowerCase()} readings yet — log your first one above.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              fontSize: 12,
              fontFamily: "var(--font-body)",
            }}
          />
          <Line type="monotone" dataKey="value" stroke="var(--color-coral)" strokeWidth={2.2} dot={{ r: 3 }} name={meta.label} />
          {type === "blood_pressure" && (
            <Line type="monotone" dataKey="secondary" stroke="var(--color-sage)" strokeWidth={2.2} dot={{ r: 3 }} name="Diastolic" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
