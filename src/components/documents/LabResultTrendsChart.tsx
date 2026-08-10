"use client";

import { useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { cn, formatDate } from "@/lib/utils";
import type { LabResult } from "@/types";

const FLAG_COLOR: Record<string, string> = {
  high: "var(--color-alert)",
  low: "var(--color-amber)",
  normal: "var(--color-sage)",
  unknown: "var(--color-ink-soft)",
};

const FLAG_DOT_CLASS: Record<string, string> = {
  high: "bg-alert",
  low: "bg-amber",
  normal: "bg-sage",
  unknown: "bg-ink-soft",
};

const FLAG_LABEL: Record<string, string> = {
  high: "High",
  low: "Low",
  normal: "Normal",
  unknown: "—",
};

function parseRefRange(ref?: string): { min?: number; max?: number } {
  if (!ref) return {};
  // Common patterns: "70-140", "< 100", "> 60", "3.5 - 5.0"
  const rangeMatch = ref.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (rangeMatch) return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
  const ltMatch = ref.match(/^[<≤]\s*([\d.]+)/);
  if (ltMatch) return { max: parseFloat(ltMatch[1]) };
  const gtMatch = ref.match(/^[>≥]\s*([\d.]+)/);
  if (gtMatch) return { min: parseFloat(gtMatch[1]) };
  return {};
}

export function LabResultTrendsChart({ labResults }: { labResults: LabResult[] }) {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  if (labResults.length === 0) return null;

  // Group by test name, keep only numeric values
  const grouped = new Map<string, LabResult[]>();
  labResults.forEach((r) => {
    if (!isNaN(parseFloat(r.value))) {
      const list = grouped.get(r.testName) || [];
      list.push(r);
      grouped.set(r.testName, list);
    }
  });

  const testNames = Array.from(grouped.keys());
  if (testNames.length === 0) return null;

  const activeTest = selectedTest ?? testNames[0];
  const items = (grouped.get(activeTest) ?? [])
    .slice()
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  const chartData = items.map((i) => ({
    date: formatDate(i.recordedAt),
    fullDate: new Date(i.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    value: parseFloat(i.value),
    unit: i.unit,
    flag: i.flag,
    refRange: i.referenceRange,
  }));

  const unit = items[0]?.unit ?? "";
  const refRange = items.find((i) => i.referenceRange)?.referenceRange;
  const { min: refMin, max: refMax } = parseRefRange(refRange);

  // Latest result stats
  const latest = chartData[chartData.length - 1];
  const previous = chartData[chartData.length - 2];
  const delta = latest && previous ? latest.value - previous.value : null;

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-ink">Lab Result Trends</h3>
          <p className="text-xs text-ink-soft mt-0.5">
            Compare extracted values across document uploads.
          </p>
        </div>

        {/* Test name selector */}
        {testNames.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {testNames.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedTest(name)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  (selectedTest ?? testNames[0]) === name
                    ? "border-ink bg-ink text-white"
                    : "border-border-strong bg-white text-ink-2 hover:border-ink/40"
                )}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current value summary */}
      {latest && (
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl bg-porcelain-2/40 border border-border px-4 py-3">
          <div>
            <p className="text-xs text-ink-soft">Latest</p>
            <p className="font-data text-xl font-semibold text-ink">
              {latest.value}
              {unit && <span className="ml-1 text-sm text-ink-soft">{unit}</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Status</p>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                latest.flag === "normal"
                  ? "bg-sage-light text-sage-dark"
                  : latest.flag === "high"
                  ? "bg-alert-light text-alert-dark"
                  : latest.flag === "low"
                  ? "bg-amber-light text-amber-dark"
                  : "bg-porcelain-2 text-ink-soft"
              )}
            >
              <span
                className={cn("size-1.5 rounded-full", FLAG_DOT_CLASS[latest.flag ?? "unknown"])}
              />
              {FLAG_LABEL[latest.flag ?? "unknown"]}
            </span>
          </div>
          {refRange && (
            <div>
              <p className="text-xs text-ink-soft">Reference</p>
              <p className="text-xs font-data font-medium text-ink-2">{refRange}</p>
            </div>
          )}
          {delta !== null && (
            <div>
              <p className="text-xs text-ink-soft">vs previous</p>
              <p
                className={cn(
                  "text-xs font-data font-semibold",
                  delta > 0 ? "text-alert-dark" : delta < 0 ? "text-sage-dark" : "text-ink-soft"
                )}
              >
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)} {unit}
              </p>
            </div>
          )}
        </div>
      )}

      {items.length < 2 ? (
        <p className="text-center py-6 text-xs text-ink-soft">
          Upload more documents to see trends over time.
        </p>
      ) : (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-ink-soft)" }}
                tickLine={false}
                axisLine={false}
              />
              {refMin !== undefined && (
                <ReferenceLine
                  y={refMin}
                  stroke="var(--color-sage)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{ value: "Low limit", position: "insideTopLeft", fontSize: 9, fill: "var(--color-sage-dark)" }}
                />
              )}
              {refMax !== undefined && (
                <ReferenceLine
                  y={refMax}
                  stroke="var(--color-alert)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{ value: "High limit", position: "insideBottomLeft", fontSize: 9, fill: "var(--color-alert-dark)" }}
                />
              )}
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-border bg-white p-3 shadow-md text-xs font-body">
                      <p className="font-medium text-ink">{d.fullDate}</p>
                      <p className="mt-1 font-data font-semibold" style={{ color: FLAG_COLOR[d.flag ?? "unknown"] }}>
                        {d.value} {d.unit}
                      </p>
                      <p className="text-ink-soft">{FLAG_LABEL[d.flag ?? "unknown"]}</p>
                      {d.refRange && <p className="mt-1 text-ink-soft">Ref: {d.refRange}</p>}
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-coral)"
                strokeWidth={2.2}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                dot={(props: any) => {
                  const { cx, cy, index, payload } = props;
                  if (cx == null || cy == null) return <g key={index} />;
                  const flagColor = FLAG_COLOR[payload.flag ?? "unknown"] ?? "var(--color-coral)";
                  return (
                    <circle
                      key={index}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={flagColor}
                      stroke="white"
                      strokeWidth={1.5}
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
