"use client";

import { useState } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useVitals } from "@/hooks/useVitals";
import { useAuth } from "@/lib/auth/AuthContext";
import { deleteVital } from "@/lib/firebase/repo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SkeletonRow, SkeletonChart } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { VitalsChart } from "@/components/vitals/VitalsChart";
import { VitalsForm } from "@/components/vitals/VitalsForm";
import { VITAL_META } from "@/types";
import type { VitalType } from "@/types";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { toast } from "@/store/toastStore";

const TABS: VitalType[] = ["heart_rate", "blood_pressure", "weight", "blood_glucose", "spo2", "sleep", "steps", "temperature"];

export default function VitalsPage() {
  const { user } = useAuth();
  const { vitals, loading } = useVitals();
  const [activeType, setActiveType] = useState<VitalType>("heart_rate");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("all");
  const [visibleCount, setVisibleCount] = useState(15);
  const [formOpen, setFormOpen] = useState(false);

  const readingsForType = vitals.filter((v) => v.type === activeType);
  const latest = readingsForType[0];
  const previous = readingsForType[1];

  let trendDelta: number | null = null;
  if (latest && previous) {
    trendDelta = latest.value - previous.value;
  }

  const now = new Date();
  const filterDate = new Date();
  if (dateRange === "7d") filterDate.setDate(now.getDate() - 7);
  else if (dateRange === "30d") filterDate.setDate(now.getDate() - 30);
  else if (dateRange === "90d") filterDate.setDate(now.getDate() - 90);

  const filteredStatsReadings = dateRange === "all" 
    ? readingsForType 
    : readingsForType.filter((r) => new Date(r.recordedAt) >= filterDate);

  let stats = null;
  if (filteredStatsReadings.length >= 2) {
    const values = filteredStatsReadings.map((r) => r.value);
    stats = {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    };
  }

  async function handleDelete(id: string) {
    if (!user) return;
    try {
      await deleteVital(user.uid, id);
      toast.success("Reading deleted.");
    } catch {
      toast.error("Failed to delete reading.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Vitals</h1>
          <p className="mt-1 text-sm text-ink-soft">Log readings and watch the trend build over time.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" /> Log a reading
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const typeReadings = vitals.filter((v) => v.type === t);
            const hasData = typeReadings.length > 0;
            return (
              <button
                key={t}
                onClick={() => {
                  setActiveType(t);
                  setVisibleCount(15);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  activeType === t
                    ? "border-ink bg-ink text-white"
                    : "border-border-strong bg-white text-ink-2 hover:border-ink/40"
                )}
              >
                <span>{VITAL_META[t].label}</span>
                {hasData && (
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      activeType === t ? "bg-coral" : "bg-sage"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex rounded-lg border border-border bg-white p-0.5 text-xs font-medium">
          {(["7d", "30d", "90d", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={cn(
                "rounded-md px-2.5 py-1 transition-colors uppercase",
                dateRange === r ? "bg-porcelain-2 text-ink font-semibold" : "text-ink-soft hover:text-ink"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <span className="text-xs text-ink-soft uppercase tracking-wide">Current Status</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-data text-2xl font-semibold text-ink">
                {latest ? latest.value : "—"} {latest?.secondaryValue ? `/${latest.secondaryValue}` : ""}
              </span>
              {latest && <span className="text-xs text-ink-soft">{VITAL_META[activeType].unit}</span>}
              {trendDelta !== null && (
                <span
                  className={cn(
                    "flex items-center text-xs font-medium gap-0.5 ml-2",
                    trendDelta > 0 ? "text-sage-dark" : trendDelta < 0 ? "text-alert-dark" : "text-ink-soft"
                  )}
                >
                  {trendDelta > 0 ? <TrendingUp className="size-3" /> : trendDelta < 0 ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
                  {trendDelta > 0 ? "+" : ""}{trendDelta.toFixed(1)} vs previous
                </span>
              )}
            </div>
          </div>
          {VITAL_META[activeType].healthyRange && (
            <div className="text-right">
              <span className="text-xs text-ink-soft">Target Range</span>
              <p className="text-xs font-data font-medium text-sage-dark">
                {VITAL_META[activeType].healthyRange![0]} – {VITAL_META[activeType].healthyRange![1]} {VITAL_META[activeType].unit}
              </p>
            </div>
          )}
        </div>

        {stats && (
          <div className="mb-4 flex items-center gap-2 text-xs font-medium text-ink-soft">
            <span className="rounded-full bg-porcelain-2 px-2.5 py-1">Min {stats.min} {VITAL_META[activeType].unit}</span>
            <span>&middot;</span>
            <span className="rounded-full bg-porcelain-2 px-2.5 py-1">Max {stats.max} {VITAL_META[activeType].unit}</span>
            <span>&middot;</span>
            <span className="rounded-full bg-porcelain-2 px-2.5 py-1">Avg {stats.avg} {VITAL_META[activeType].unit}</span>
          </div>
        )}

        {loading ? <SkeletonChart /> : <VitalsChart type={activeType} readings={readingsForType} dateRange={dateRange} />}
      </Card>

      <Card>
        <div className="border-b border-border p-5">
          <h2 className="font-display text-base font-semibold text-ink">Recent readings</h2>
        </div>
        <div className="divide-y divide-border">
          {loading && (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          )}
          {!loading && readingsForType.length === 0 && (
            <EmptyState
              icon={Plus}
              title={`No ${VITAL_META[activeType].label.toLowerCase()} readings yet`}
              description="Log your first reading to start tracking trends."
              action={{ label: "Log reading", onClick: () => setFormOpen(true) }}
            />
          )}
          {readingsForType.slice(0, visibleCount).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-data text-sm font-medium text-ink">
                  {r.value}
                  {r.secondaryValue ? `/${r.secondaryValue}` : ""} {r.unit}
                </p>
                <p className="text-xs text-ink-soft">
                  {formatDate(r.recordedAt)} · {formatTime(r.recordedAt)}
                  {r.note ? ` · ${r.note}` : ""}
                </p>
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                className="rounded-lg p-2 text-ink-soft hover:bg-alert-light hover:text-alert transition-colors"
                aria-label="Delete reading"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {readingsForType.length > visibleCount && (
            <div className="p-4 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + 10)}>
                Load more ({readingsForType.length - visibleCount} more)
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Log a reading">
        <VitalsForm defaultType={activeType} onDone={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
