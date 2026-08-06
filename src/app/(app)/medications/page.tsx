"use client";

import { useState } from "react";
import { Plus, Pill, Check, Archive, RotateCcw, Trash2 } from "lucide-react";
import { useMedications } from "@/hooks/useMedications";
import { useAuth } from "@/lib/auth/AuthContext";
import { updateMedication, deleteMedication } from "@/lib/firebase/repo";
import { updateUserMedicationTaken } from "@/lib/medHelpers";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { MedicationForm } from "@/components/medications/MedicationForm";
import { formatDate } from "@/lib/utils";

function isTakenToday(lastTakenAt?: string | null) {
  if (!lastTakenAt) return false;
  const last = new Date(lastTakenAt);
  const now = new Date();
  return last.toDateString() === now.toDateString();
}

export default function MedicationsPage() {
  const { user } = useAuth();
  const { medications, loading } = useMedications();
  const [formOpen, setFormOpen] = useState(false);

  const active = medications.filter((m) => m.active);
  const inactive = medications.filter((m) => !m.active);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Medications</h1>
          <p className="mt-1 text-sm text-ink-soft">Track dosage, schedule, and what&apos;s actually been taken.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" /> Add medication
        </Button>
      </div>

      {loading && <p className="text-sm text-ink-soft">Loading…</p>}

      {!loading && active.length === 0 && inactive.length === 0 && (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Pill className="size-8 text-ink-soft" />
          <p className="text-sm text-ink-soft">No medications added yet.</p>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" /> Add your first medication
          </Button>
        </Card>
      )}

      {active.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {active.map((med) => {
            const taken = isTakenToday(med.lastTakenAt);
            return (
              <Card key={med.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-10 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: med.color }}
                    >
                      <Pill className="size-4.5" />
                    </div>
                    <div>
                      <p className="font-medium text-ink">{med.name}</p>
                      <p className="text-xs text-ink-soft">{med.dosage}</p>
                    </div>
                  </div>
                  {taken && <Badge tone="sage">Taken today</Badge>}
                </div>

                {med.times.length > 0 && (
                  <p className="mt-3 text-xs text-ink-soft">Scheduled: {med.times.join(", ")}</p>
                )}
                {med.instructions && <p className="mt-1 text-xs text-ink-soft">{med.instructions}</p>}
                <p className="mt-1 text-xs text-ink-soft">Since {formatDate(med.startDate)}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={taken ? "outline" : "primary"}
                    disabled={taken || !user}
                    onClick={() => user && updateUserMedicationTaken(user.uid, med.id)}
                  >
                    <Check className="size-3.5" /> {taken ? "Taken" : "Mark taken"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => user && updateMedication(user.uid, med.id, { active: false })}
                  >
                    <Archive className="size-3.5" /> Archive
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-base font-semibold text-ink-soft">Archived</h2>
          <div className="flex flex-col gap-2">
            {inactive.map((med) => (
              <Card key={med.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-ink-soft">{med.name}</p>
                  <p className="text-xs text-ink-soft">{med.dosage}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => user && updateMedication(user.uid, med.id, { active: true })}
                  >
                    <RotateCcw className="size-3.5" /> Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => user && deleteMedication(user.uid, med.id)}
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add medication">
        <MedicationForm onDone={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
