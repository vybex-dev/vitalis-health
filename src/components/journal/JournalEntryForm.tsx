"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { addJournalEntry } from "@/lib/firebase/repo";
import { cn } from "@/lib/utils";

const MOODS = [
  { v: 1, emoji: "😞", label: "Rough" },
  { v: 2, emoji: "🙁", label: "Low" },
  { v: 3, emoji: "😐", label: "Okay" },
  { v: 4, emoji: "🙂", label: "Good" },
  { v: 5, emoji: "😄", label: "Great" },
] as const;

export function JournalEntryForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      await addJournalEntry(user.uid, {
        date,
        mood,
        symptoms: symptoms.split(",").map((s) => s.trim()).filter(Boolean),
        notes,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      <div>
        <label className="mb-2 block text-sm font-medium text-ink-2">Mood</label>
        <div className="flex justify-between gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => setMood(m.v)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl border p-2.5 text-xs transition-colors",
                mood === m.v ? "border-coral bg-coral-light" : "border-border-strong hover:bg-porcelain-2"
              )}
            >
              <span className="text-xl">{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Symptoms today (comma separated, optional)"
        placeholder="e.g. mild headache, fatigue"
        value={symptoms}
        onChange={(e) => setSymptoms(e.target.value)}
      />

      <Textarea
        label="Notes"
        placeholder="Anything on your mind about how you're feeling today"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <Button type="submit" loading={busy} className="mt-1 w-full justify-center">
        Save entry
      </Button>
    </form>
  );
}
