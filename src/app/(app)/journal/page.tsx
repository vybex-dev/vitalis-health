"use client";

import { useState } from "react";
import { Plus, Sparkles, Trash2, BookOpen, Calendar } from "lucide-react";
import { useJournal } from "@/hooks/useJournal";
import { useAuth } from "@/lib/auth/AuthContext";
import { deleteJournalEntry } from "@/lib/firebase/repo";
import { summarizeJournal } from "@/lib/aiClient";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { JournalEntryForm } from "@/components/journal/JournalEntryForm";
import { MoodHeatmap } from "@/components/journal/MoodHeatmap";
import { formatDate } from "@/lib/utils";
import { toast } from "@/store/toastStore";
import type { JournalEntry } from "@/types";
import { Flame } from "lucide-react";

const MOOD_EMOJI: Record<number, string> = {
  1: "😞",
  2: "🙁",
  3: "😐",
  4: "🙂",
  5: "😄",
};

function groupEntriesByMonth(entries: JournalEntry[]) {
  const groups = new Map<string, JournalEntry[]>();

  entries.forEach((entry) => {
    const d = new Date(entry.date);
    const monthKey = d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const list = groups.get(monthKey) || [];
    list.push(entry);
    groups.set(monthKey, list);
  });

  return Array.from(groups.entries());
}

function computeJournalStreak(journal: JournalEntry[]) {
  const dates = new Set<string>();

  journal.forEach((j) => {
    dates.add(j.date);
  });

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    if (dates.has(dateStr)) {
      streak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }

  const last7Days: { dayName: string; logged: boolean; isToday: boolean }[] =
    [];
  const days = ["S", "M", "T", "W", "T", "F", "S"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    last7Days.push({
      dayName: days[d.getDay()],
      logged: dates.has(dateStr),
      isToday: i === 0,
    });
  }

  return { streak, last7Days };
}

export default function JournalPage() {
  const { user, getIdToken } = useAuth();
  const { entries, loading } = useJournal();
  const [formOpen, setFormOpen] = useState(false);
  const [summary, setSummary] = useState<Awaited<
    ReturnType<typeof summarizeJournal>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSummarize() {
    setBusy(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      const result = await summarizeJournal(token, entries.slice(0, 30));
      setSummary(result);
      toast.success("AI reflection generated!");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Couldn't summarize right now.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    try {
      await deleteJournalEntry(user.uid, id);
      toast.success("Journal entry deleted.");
    } catch {
      toast.error("Failed to delete journal entry.");
    }
  }

  const monthGroups = groupEntriesByMonth(entries);
  const { streak, last7Days } = computeJournalStreak(entries);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Journal
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            A few seconds a day builds a picture worth bringing to appointments.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" /> New entry
        </Button>
      </div>

      <MoodHeatmap entries={entries} />

      <Card className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-coral-light/30">
            <span style={{ fontSize: `${Math.min(24 + streak * 2, 48)}px` }}>
              <Flame className="size-6 text-coral" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-data text-2xl font-semibold text-ink">
                {streak}
              </span>
              <span className="text-xs font-medium text-ink-soft uppercase tracking-wide">
                Day streak
              </span>
            </div>
            <p className="text-xs text-ink-soft">
              {streak > 0
                ? "Keep journaling daily!"
                : "Write a journal entry today!"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {last7Days.map((d, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-ink-soft">
                {d.dayName}
              </span>
              <div
                className={`size-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                  d.logged
                    ? "bg-sage text-white"
                    : d.isToday
                      ? "border-2 border-dashed border-coral text-coral"
                      : "bg-porcelain-2 text-ink-soft"
                }`}
              >
                {d.logged ? "✓" : ""}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-coral" />
            <h2 className="font-display text-base font-semibold text-ink">
              AI reflection
            </h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSummarize}
            loading={busy}
            disabled={entries.length === 0}
          >
            Summarize recent entries
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-alert">{error}</p>}
        {summary && (
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-sm leading-relaxed text-ink-2">
              {summary.summary}
            </p>
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink-2">Mood trend:</span>{" "}
              {summary.moodTrend}
            </p>
            {summary.recurringSymptoms.length > 0 && (
              <p className="text-sm text-ink-soft">
                <span className="font-medium text-ink-2">Recurring:</span>{" "}
                {summary.recurringSymptoms.join(", ")}
              </p>
            )}
            <p className="rounded-xl bg-sage-light p-3 text-sm text-sage-dark">
              {summary.suggestion}
            </p>
          </div>
        )}
      </Card>

      <div>
        {loading && (
          <div className="flex flex-col gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}
        {!loading && entries.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title="No journal entries yet"
            description="Start logging your daily mood, symptoms, and thoughts."
            action={{
              label: "Create first entry",
              onClick: () => setFormOpen(true),
            }}
          />
        )}
        <div className="flex flex-col gap-6">
          {monthGroups.map(([monthLabel, groupEntries]) => (
            <div key={monthLabel} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                <Calendar className="size-3.5 text-coral" />
                <span>{monthLabel}</span>
                <span className="rounded-full bg-porcelain-2 px-2 py-0.5 text-[10px]">
                  {groupEntries.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {groupEntries.map((e) => (
                  <Card
                    key={e.id}
                    className="flex items-start gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-card)]"
                  >
                    <span className="text-2xl">{MOOD_EMOJI[e.mood]}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-ink">
                          {formatDate(e.date, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="rounded-lg p-1.5 text-ink-soft hover:bg-alert-light hover:text-alert transition-colors"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      {e.symptoms.length > 0 && (
                        <p className="mt-1 text-xs text-ink-soft">
                          Symptoms: {e.symptoms.join(", ")}
                        </p>
                      )}
                      {e.notes && (
                        <p className="mt-1.5 text-sm text-ink-2">{e.notes}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="New journal entry"
      >
        <JournalEntryForm onDone={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
