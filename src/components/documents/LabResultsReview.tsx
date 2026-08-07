"use client";

import { useState } from "react";
import { Check, Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { addLabResult } from "@/lib/firebase/repo";
import { cn } from "@/lib/utils";
import type { ExtractedLabValue } from "@/types";

interface Row extends ExtractedLabValue {
  included: boolean;
}

export function LabResultsReview({
  values,
  sourceDocumentId,
  onSaved,
}: {
  values: ExtractedLabValue[];
  sourceDocumentId: string;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>(values.map((v) => ({ ...v, included: true })));
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  const includedCount = rows.filter((r) => r.included).length;

  async function handleSave() {
    if (!user || includedCount === 0) return;
    setBusy(true);
    try {
      await Promise.all(
        rows
          .filter((r) => r.included)
          .map((r) =>
            addLabResult(user.uid, {
              testName: r.testName,
              value: r.value,
              unit: r.unit || undefined,
              referenceRange: r.referenceRange || undefined,
              flag: r.flag,
              recordedAt: new Date(recordedAt).toISOString(),
              sourceDocumentId,
            })
          )
      );
      setSaved(true);
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  if (values.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lab results found ({values.length})</CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="mb-4 flex items-end gap-3">
          <Input
            label="Date of this report"
            type="date"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            className="max-w-48"
          />
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <div
              key={i}
              className={cn(
                "grid grid-cols-[auto_1.4fr_0.9fr_0.7fr_1fr_0.8fr] items-center gap-2 rounded-xl border border-border p-2.5",
                !row.included && "opacity-40"
              )}
            >
              <input
                type="checkbox"
                checked={row.included}
                onChange={(e) => updateRow(i, { included: e.target.checked })}
                className="size-4 accent-coral"
                aria-label={`Include ${row.testName}`}
              />
              <input
                value={row.testName}
                onChange={(e) => updateRow(i, { testName: e.target.value })}
                className="min-w-0 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm text-ink hover:border-border-strong focus:border-coral focus:outline-none"
              />
              <input
                value={row.value}
                onChange={(e) => updateRow(i, { value: e.target.value })}
                className="min-w-0 rounded-lg border border-transparent bg-transparent px-1.5 py-1 font-data text-sm text-ink hover:border-border-strong focus:border-coral focus:outline-none"
              />
              <input
                value={row.unit ?? ""}
                placeholder="unit"
                onChange={(e) => updateRow(i, { unit: e.target.value })}
                className="min-w-0 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-xs text-ink-soft hover:border-border-strong focus:border-coral focus:outline-none"
              />
              <input
                value={row.referenceRange ?? ""}
                placeholder="reference range"
                onChange={(e) => updateRow(i, { referenceRange: e.target.value })}
                className="min-w-0 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-xs text-ink-soft hover:border-border-strong focus:border-coral focus:outline-none"
              />
              <Select
                value={row.flag}
                onChange={(e) => updateRow(i, { flag: e.target.value as Row["flag"] })}
                className="h-8 text-xs"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="unknown">Unknown</option>
              </Select>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button size="sm" onClick={handleSave} loading={busy} disabled={includedCount === 0 || saved}>
            {saved ? (
              <>
                <Check className="size-3.5" /> Saved
              </>
            ) : (
              <>
                <Save className="size-3.5" /> Save {includedCount} result{includedCount === 1 ? "" : "s"}
              </>
            )}
          </Button>
          <p className="text-xs text-ink-soft">Uncheck anything that wasn&apos;t read correctly, or edit it inline.</p>
        </div>
      </CardBody>
    </Card>
  );
}
