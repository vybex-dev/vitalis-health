"use client";

import { useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useJournal } from "@/hooks/useJournal";
import { useAuth } from "@/lib/auth/AuthContext";
import { deleteJournalEntry } from "@/lib/firebase/repo";
import { summarizeJournal } from "@/lib/aiClient";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { JournalEntryForm } from "@/components/journal/JournalEntryForm";
import { formatDate } from "@/lib/utils";

const MOOD_EMOJI: Record<number, string> = { 1: "😞", 2: "🙁", 3: "😐", 4: "🙂", 5: "😄" };

export default function JournalPage() {
  const { user, getIdToken } = useAuth();
  const { entries, loading } = useJournal();
  const [formOpen, setFormOpen] = useState(false);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof summarizeJournal>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSummarize() {
    setBusy(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      const result = await summarizeJournal(token, entries);
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't summarize right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Journal</h1>
          <p className="mt-1 text-sm text-ink-soft">A few seconds a day builds a picture worth bringing to appointments.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" /> New entry
        </Button>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-coral" />
            <h2 className="font-display text-base font-semibold text-ink">AI reflection</h2>
          </div>
          <Button size="sm" variant="outline" onClick={handleSummarize} loading={busy} disabled={entries.length === 0}>
            Summarize recent entries
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-alert">{error}</p>}
        {summary && (
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-sm leading-relaxed text-ink-2">{summary.summary}</p>
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink-2">Mood trend:</span> {summary.moodTrend}
            </p>
            {summary.recurringSymptoms.length > 0 && (
              <p className="text-sm text-ink-soft">
                <span className="font-medium text-ink-2">Recurring:</span> {summary.recurringSymptoms.join(", ")}
              </p>
            )}
            <p className="rounded-xl bg-sage-light p-3 text-sm text-sage-dark">{summary.suggestion}</p>
          </div>
        )}
      </Card>

      <div>
        {loading && <p className="text-sm text-ink-soft">Loading…</p>}
        {!loading && entries.length === 0 && (
          <Card className="p-10 text-center text-sm text-ink-soft">No entries yet. Start with today.</Card>
        )}
        <div className="flex flex-col gap-3">
          {entries.map((e) => (
            <Card key={e.id} className="flex items-start gap-4 p-4">
              <span className="text-2xl">{MOOD_EMOJI[e.mood]}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">{formatDate(e.date, { weekday: "short", month: "short", day: "numeric" })}</p>
                  <button
                    onClick={() => user && deleteJournalEntry(user.uid, e.id)}
                    className="rounded-lg p-1.5 text-ink-soft hover:bg-alert-light hover:text-alert"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {e.symptoms.length > 0 && (
                  <p className="mt-1 text-xs text-ink-soft">Symptoms: {e.symptoms.join(", ")}</p>
                )}
                {e.notes && <p className="mt-1.5 text-sm text-ink-2">{e.notes}</p>}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="New journal entry">
        <JournalEntryForm onDone={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
