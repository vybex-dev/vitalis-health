"use client";

import { Pill, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Medication } from "@/types";
import { updateUserMedicationTaken } from "@/lib/medHelpers";
import { useAuth } from "@/lib/auth/AuthContext";

function isTakenToday(med: Medication) {
  if (!med.lastTakenAt) return false;
  const last = new Date(med.lastTakenAt);
  const now = new Date();
  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate()
  );
}

export function UpcomingMeds({ medications }: { medications: Medication[] }) {
  const { user } = useAuth();
  const active = medications.filter((m) => m.active);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s medications</CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        {active.length === 0 ? (
          <p className="text-sm text-ink-soft">No active medications yet. Add one from the Medications page.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((med) => {
              const taken = isTakenToday(med);
              return (
                <li key={med.id} className="flex items-center justify-between gap-3 rounded-xl bg-porcelain-2/60 p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-9 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: med.color }}
                    >
                      <Pill className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{med.name}</p>
                      <p className="text-xs text-ink-soft">
                        {med.dosage} · {med.times.join(", ") || "as needed"}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={taken ? "outline" : "primary"}
                    disabled={taken || !user}
                    onClick={() => user && updateUserMedicationTaken(user.uid, med.id)}
                  >
                    {taken ? (
                      <>
                        <Check className="size-3.5" /> Taken
                      </>
                    ) : (
                      "Mark taken"
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
