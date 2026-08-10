"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import { VITAL_META } from "@/types";
import type { VitalReading, VitalType } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";

export function VitalsChart({
  type,
  readings,
  dateRange = "all",
}: {
  type: VitalType;
  readings: VitalReading[];
  dateRange?: "7d" | "30d" | "90d" | "all";
}) {
  const meta = VITAL_META[type];

  const now = Date.now();
  const rangeMs =
    dateRange === "7d"
      ? 7 * 86400000
      : dateRange === "30d"
      ? 30 * 86400000
      : dateRange === "90d"
      ? 90 * 86400000
      : Infinity;

  const filteredReadings = readings.filter(
    (r) => now - new Date(r.recordedAt).getTime() <= rangeMs
  );

  const data = [...filteredReadings]
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((r) => ({
      date: formatDate(r.recordedAt),
      fullDate: `${formatDate(r.recordedAt)} ${formatTime(r.recordedAt)}`,
      value: r.value,
      secondary: r.secondaryValue ?? undefined,
      note: r.note,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border-strong text-sm text-ink-soft">
        No {meta.label.toLowerCase()} readings for this period — log your first one above.
      </div>
    );
  }

  const [healthyMin, healthyMax] = meta.healthyRange ?? [0, 0];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          
          {meta.healthyRange && (
            <ReferenceArea
              y1={healthyMin}
              y2={healthyMax}
              fill="var(--color-sage-light)"
              fillOpacity={0.4}
              stroke="transparent"
            />
          )}

          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }} tickLine={false} axisLine={false} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const item = payload[0].payload;
              return (
                <div className="rounded-xl border border-border bg-white p-3 shadow-md text-xs font-body">
                  <p className="font-medium text-ink">{item.fullDate}</p>
                  <p className="mt-1 font-data font-semibold text-coral">
                    {meta.label}: {item.value} {meta.unit}
                  </p>
                  {item.secondary !== undefined && (
                    <p className="font-data font-semibold text-sage">
                      Diastolic: {item.secondary} {meta.unit}
                    </p>
                  )}
                  {item.note && <p className="mt-1 text-ink-soft italic">&quot;{item.note}&quot;</p>}
                </div>
              );
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
