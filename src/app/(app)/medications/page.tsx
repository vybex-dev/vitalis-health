"use client";

import { useState } from "react";
import { Plus, Pill, Check, Archive, RotateCcw, Trash2, ShieldAlert, Sparkles, Sun, Sunset, Moon, Clock } from "lucide-react";
import { useMedications } from "@/hooks/useMedications";
import { useAuth } from "@/lib/auth/AuthContext";
import { updateMedication, deleteMedication } from "@/lib/firebase/repo";
import { updateUserMedicationTaken } from "@/lib/medHelpers";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { MedicationForm } from "@/components/medications/MedicationForm";
import { AdherenceRing } from "@/components/medications/AdherenceRing";
import { formatDate } from "@/lib/utils";
import { toast } from "@/store/toastStore";
import type { Medication } from "@/types";

function isTakenToday(lastTakenAt?: string | null) {
  if (!lastTakenAt) return false;
  const last = new Date(lastTakenAt);
  const now = new Date();
  return last.toDateString() === now.toDateString();
}

interface InteractionResult {
  hasInteractions: boolean;
  interactions: {
    medicationA: string;
    medicationB: string;
    severity: "mild" | "moderate" | "severe";
    description: string;
    recommendation: string;
  }[];
  disclaimer: string;
}

export default function MedicationsPage() {
  const { user, getIdToken } = useAuth();
  const { medications, loading } = useMedications();
  const [formOpen, setFormOpen] = useState(false);
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [interactionResult, setInteractionResult] = useState<InteractionResult | null>(null);

  const active = medications.filter((m) => m.active);
  const inactive = medications.filter((m) => !m.active);

  const morning: typeof medications = [];
  const afternoon: typeof medications = [];
  const evening: typeof medications = [];
  const asNeeded: typeof medications = [];

  active.forEach((m) => {
    if (m.frequency === "as_needed") {
      asNeeded.push(m);
      return;
    }
    
    if (!m.times || m.times.length === 0) {
      evening.push(m);
      return;
    }

    let earliestBucket = 3;
    m.times.forEach((t) => {
      const [hStr] = t.split(":");
      const h = parseInt(hStr, 10);
      if (!isNaN(h)) {
        if (h < 12) earliestBucket = Math.min(earliestBucket, 1);
        else if (h >= 12 && h < 17) earliestBucket = Math.min(earliestBucket, 2);
        else earliestBucket = Math.min(earliestBucket, 3);
      }
    });

    if (earliestBucket === 1) morning.push(m);
    else if (earliestBucket === 2) afternoon.push(m);
    else evening.push(m);
  });

  async function handleMarkTaken(id: string) {
    if (!user) return;
    try {
      await updateUserMedicationTaken(user.uid, id);
      toast.success("Marked medication as taken!");
    } catch {
      toast.error("Failed to update medication status.");
    }
  }

  async function handleArchive(id: string, activeStatus: boolean) {
    if (!user) return;
    try {
      await updateMedication(user.uid, id, { active: activeStatus });
      toast.info(activeStatus ? "Medication restored." : "Medication archived.");
    } catch {
      toast.error("Failed to update medication.");
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    try {
      await deleteMedication(user.uid, id);
      toast.success("Medication deleted.");
    } catch {
      toast.error("Failed to delete medication.");
    }
  }

  async function handleCheckInteractions() {
    if (!user || active.length < 2) return;
    setCheckingInteractions(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/medications/check-interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ medications: active }),
      });
      if (!res.ok) throw new Error("Interaction check failed");
      const data = await res.json();
      setInteractionResult(data);
      if (data.hasInteractions) {
        toast.warning("Potential drug interactions detected!");
      } else {
        toast.success("No clinical interactions detected.");
      }
    } catch {
      toast.error("Could not check interactions at this time.");
    } finally {
      setCheckingInteractions(false);
    }
  }

  function renderMedCard(med: Medication) {
    const taken = isTakenToday(med.lastTakenAt);
    return (
      <Card key={med.id} className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-xl text-white shadow-sm"
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
            onClick={() => handleMarkTaken(med.id)}
          >
            <Check className="size-3.5" /> {taken ? "Taken" : "Mark taken"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleArchive(med.id, false)}
          >
            <Archive className="size-3.5" /> Archive
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Medications</h1>
          <p className="mt-1 text-sm text-ink-soft">Track dosage, schedule, and what&apos;s actually been taken.</p>
        </div>
        <div className="flex items-center gap-2">
          {active.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckInteractions}
              loading={checkingInteractions}
            >
              <ShieldAlert className="size-4 text-amber-dark" /> Check Interactions
            </Button>
          )}
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" /> Add medication
          </Button>
        </div>
      </div>

      <AdherenceRing medications={medications} />

      {interactionResult && (
        <Card className="p-5 border-amber/30 bg-amber-light/20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-amber-dark font-semibold text-sm">
              <ShieldAlert className="size-4" /> AI Drug Interaction Analysis
            </div>
            <button
              onClick={() => setInteractionResult(null)}
              className="text-xs text-ink-soft hover:text-ink"
            >
              Dismiss
            </button>
          </div>
          {interactionResult.hasInteractions ? (
            <div className="flex flex-col gap-3 mt-3">
              {interactionResult.interactions.map((int, i) => (
                <div key={i} className="p-3 bg-white rounded-xl border border-amber/30 text-xs">
                  <p className="font-semibold text-ink">
                    {int.medicationA} + {int.medicationB} ({int.severity.toUpperCase()})
                  </p>
                  <p className="text-ink-2 mt-1">{int.description}</p>
                  <p className="text-amber-dark font-medium mt-1">Recommendation: {int.recommendation}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-sage-dark font-medium">
              No known clinical interactions detected between your current active medications.
            </p>
          )}
          <p className="text-[10px] text-ink-soft mt-3 italic">{interactionResult.disclaimer}</p>
        </Card>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && active.length === 0 && inactive.length === 0 && (
        <EmptyState
          icon={Pill}
          title="No medications added yet"
          description="Keep track of dosages, schedules, and daily adherence."
          action={{ label: "Add first medication", onClick: () => setFormOpen(true) }}
        />
      )}

      {morning.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sun className="size-4 text-amber" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Morning ({morning.length})
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">{morning.map(renderMedCard)}</div>
        </div>
      )}

      {afternoon.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sunset className="size-4 text-coral" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Afternoon ({afternoon.length})
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">{afternoon.map(renderMedCard)}</div>
        </div>
      )}

      {evening.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Moon className="size-4 text-ink-soft" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Evening ({evening.length})
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">{evening.map(renderMedCard)}</div>
        </div>
      )}

      {asNeeded.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="size-4 text-sage" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
              As Needed / PRN ({asNeeded.length})
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">{asNeeded.map(renderMedCard)}</div>
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Archived ({inactive.length})
          </h2>
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
                    onClick={() => handleArchive(med.id, true)}
                  >
                    <RotateCcw className="size-3.5" /> Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(med.id)}
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
