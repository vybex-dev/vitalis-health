"use client";

import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MedicationForm } from "@/components/medications/MedicationForm";
import type { ExtractedMedication } from "@/types";

export function MedicationsExtractionReview({
  medications,
  sourceDocumentId,
}: {
  medications: ExtractedMedication[];
  sourceDocumentId: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());

  if (medications.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medications found ({medications.length})</CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="flex flex-col gap-2">
          {medications.map((m, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{m.medicationName}</p>
                <p className="truncate text-xs text-ink-soft">
                  {[m.dosage, m.frequency, m.instructions].filter(Boolean).join(" · ") || "No further details read"}
                </p>
              </div>
              <Button
                size="sm"
                variant={added.has(i) ? "outline" : "primary"}
                disabled={added.has(i)}
                onClick={() => setActiveIndex(i)}
              >
                {added.has(i) ? (
                  <>
                    <Check className="size-3.5" /> Added
                  </>
                ) : (
                  <>
                    <Plus className="size-3.5" /> Add
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          Review the schedule and dosage before adding — Vitalis prefills what it read, you confirm the rest.
        </p>
      </CardBody>

      <Modal
        open={activeIndex !== null}
        onClose={() => setActiveIndex(null)}
        title={activeIndex !== null ? `Add ${medications[activeIndex].medicationName}` : undefined}
      >
        {activeIndex !== null && (
          <MedicationForm
            initial={{
              name: medications[activeIndex].medicationName,
              dosage: medications[activeIndex].dosage,
              instructions: medications[activeIndex].instructions,
            }}
            sourceDocumentId={sourceDocumentId}
            onDone={() => {
              setAdded((s) => new Set(s).add(activeIndex));
              setActiveIndex(null);
            }}
          />
        )}
      </Modal>
    </Card>
  );
}
