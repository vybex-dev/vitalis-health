"use client";

import { useState } from "react";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { VITAL_META } from "@/types";
import type { VitalType } from "@/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { addVital } from "@/lib/firebase/repo";

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function VitalsForm({ defaultType, onDone }: { defaultType?: VitalType; onDone: () => void }) {
  const { user } = useAuth();
  const [type, setType] = useState<VitalType>(defaultType ?? "heart_rate");
  const [value, setValue] = useState("");
  const [secondary, setSecondary] = useState("");
  const [recordedAt, setRecordedAt] = useState(nowLocal());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const meta = VITAL_META[type];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !value) return;
    setBusy(true);
    try {
      await addVital(user.uid, {
        type,
        value: Number(value),
        secondaryValue: type === "blood_pressure" && secondary ? Number(secondary) : null,
        unit: meta.unit,
        note: note || undefined,
        recordedAt: new Date(recordedAt).toISOString(),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Select label="Type" value={type} onChange={(e) => setType(e.target.value as VitalType)}>
        {Object.entries(VITAL_META).map(([key, m]) => (
          <option key={key} value={key}>
            {m.label}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={type === "blood_pressure" ? "Systolic" : `Value (${meta.unit})`}
          type="number"
          step="any"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {type === "blood_pressure" && (
          <Input
            label="Diastolic"
            type="number"
            step="any"
            required
            value={secondary}
            onChange={(e) => setSecondary(e.target.value)}
          />
        )}
      </div>

      <Input
        label="When"
        type="datetime-local"
        required
        value={recordedAt}
        onChange={(e) => setRecordedAt(e.target.value)}
      />

      <Textarea label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />

      <Button type="submit" loading={busy} className="mt-1 w-full justify-center">
        Save reading
      </Button>
    </form>
  );
}
