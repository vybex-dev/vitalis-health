"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useVitals } from "@/hooks/useVitals";
import { useAuth } from "@/lib/auth/AuthContext";
import { deleteVital } from "@/lib/firebase/repo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { VitalsChart } from "@/components/vitals/VitalsChart";
import { VitalsForm } from "@/components/vitals/VitalsForm";
import { VITAL_META } from "@/types";
import type { VitalType } from "@/types";
import { cn, formatDate, formatTime } from "@/lib/utils";

const TABS: VitalType[] = ["heart_rate", "blood_pressure", "weight", "blood_glucose", "spo2", "sleep", "steps", "temperature"];

export default function VitalsPage() {
  const { user } = useAuth();
  const { vitals, loading } = useVitals();
  const [activeType, setActiveType] = useState<VitalType>("heart_rate");
  const [formOpen, setFormOpen] = useState(false);

  const readingsForType = vitals.filter((v) => v.type === activeType);

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

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              activeType === t
                ? "border-ink bg-ink text-white"
                : "border-border-strong bg-white text-ink-2 hover:border-ink/40"
            )}
          >
            {VITAL_META[t].label}
          </button>
        ))}
      </div>

      <Card className="p-5">
        <VitalsChart type={activeType} readings={readingsForType} />
      </Card>

      <Card>
        <div className="border-b border-border p-5">
          <h2 className="font-display text-base font-semibold text-ink">Recent readings</h2>
        </div>
        <div className="divide-y divide-border">
          {loading && <p className="p-5 text-sm text-ink-soft">Loading…</p>}
          {!loading && readingsForType.length === 0 && (
            <p className="p-5 text-sm text-ink-soft">Nothing logged yet for {VITAL_META[activeType].label.toLowerCase()}.</p>
          )}
          {readingsForType.slice(0, 15).map((r) => (
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
                onClick={() => user && deleteVital(user.uid, r.id)}
                className="rounded-lg p-2 text-ink-soft hover:bg-alert-light hover:text-alert"
                aria-label="Delete reading"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Log a reading">
        <VitalsForm defaultType={activeType} onDone={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
