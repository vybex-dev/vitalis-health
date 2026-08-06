"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { addMedication } from "@/lib/firebase/repo";
import { stringToHue } from "@/lib/utils";
import type { MedicationFrequency } from "@/types";

const FREQUENCIES: { value: MedicationFrequency; label: string; defaultTimes: string[] }[] = [
  { value: "once_daily", label: "Once daily", defaultTimes: ["09:00"] },
  { value: "twice_daily", label: "Twice daily", defaultTimes: ["09:00", "21:00"] },
  { value: "three_times_daily", label: "Three times daily", defaultTimes: ["08:00", "14:00", "20:00"] },
  { value: "weekly", label: "Weekly", defaultTimes: ["09:00"] },
  { value: "as_needed", label: "As needed", defaultTimes: [] },
  { value: "custom", label: "Custom", defaultTimes: [] },
];

export function MedicationForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState<MedicationFrequency>("once_daily");
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [instructions, setInstructions] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  function handleFrequency(freq: MedicationFrequency) {
    setFrequency(freq);
    const preset = FREQUENCIES.find((f) => f.value === freq);
    setTimes(preset?.defaultTimes ?? []);
  }

  function updateTime(i: number, val: string) {
    setTimes((t) => t.map((x, idx) => (idx === i ? val : x)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name || !dosage) return;
    setBusy(true);
    try {
      await addMedication(user.uid, {
        name,
        dosage,
        frequency,
        times: times.filter(Boolean),
        instructions: instructions || undefined,
        startDate,
        endDate: null,
        active: true,
        color: `hsl(${stringToHue(name)}, 55%, 52%)`,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Medication name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Dosage" placeholder="e.g. 500mg" required value={dosage} onChange={(e) => setDosage(e.target.value)} />

      <Select
        label="Frequency"
        value={frequency}
        onChange={(e) => handleFrequency(e.target.value as MedicationFrequency)}
      >
        {FREQUENCIES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </Select>

      {times.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink-2">Times</label>
          <div className="flex flex-wrap gap-2">
            {times.map((t, i) => (
              <input
                key={i}
                type="time"
                value={t}
                onChange={(e) => updateTime(i, e.target.value)}
                className="h-10 rounded-lg border border-border-strong px-2 text-sm outline-none focus:border-coral"
              />
            ))}
          </div>
        </div>
      )}

      <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      <Textarea
        label="Instructions (optional)"
        placeholder="e.g. take with food"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
      />

      <Button type="submit" loading={busy} className="mt-1 w-full justify-center">
        Save medication
      </Button>
    </form>
  );
}
