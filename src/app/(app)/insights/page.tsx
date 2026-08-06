"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, Eye, Lightbulb } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useVitals } from "@/hooks/useVitals";
import { useJournal } from "@/hooks/useJournal";
import { useInsights } from "@/hooks/useSymptomChecks";
import { generateWeeklyInsight } from "@/lib/aiClient";
import { saveInsight } from "@/lib/firebase/repo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate, formatRelative } from "@/lib/utils";

export default function InsightsPage() {
  const { user, getIdToken } = useAuth();
  const { vitals } = useVitals();
  const { entries: journal } = useJournal();
  const { insights, loading } = useInsights();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      const result = await generateWeeklyInsight(token, vitals.slice(0, 40), journal.slice(0, 20));
      await saveInsight(user.uid, {
        period: "weekly",
        rangeStart: new Date(Date.now() - 7 * 86400000).toISOString(),
        rangeEnd: new Date().toISOString(),
        ...result,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate an insight right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Insights</h1>
          <p className="mt-1 text-sm text-ink-soft">AI-generated summaries of what your logged data shows.</p>
        </div>
        <Button onClick={handleGenerate} loading={busy}>
          <Sparkles className="size-4" /> Generate new insight
        </Button>
      </div>

      {error && <p className="text-sm text-alert">{error}</p>}

      {loading && <p className="text-sm text-ink-soft">Loading…</p>}

      {!loading && insights.length === 0 && (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Sparkles className="size-8 text-ink-soft" />
          <p className="text-sm text-ink-soft">
            No insights yet. Log a few vitals or journal entries, then generate your first one.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {insights.map((ins) => (
          <Card key={ins.id} className="p-6">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-ink-soft">
                {formatDate(ins.rangeStart)} – {formatDate(ins.rangeEnd)}
              </p>
              <p className="text-xs text-ink-soft">{formatRelative(ins.generatedAt)}</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{ins.summary}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {ins.highlights.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sage-dark">
                    <TrendingUp className="size-3.5" /> Highlights
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {ins.highlights.map((h, i) => (
                      <li key={i} className="text-sm text-ink-2">
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ins.watchOuts.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-dark">
                    <Eye className="size-3.5" /> Watch
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {ins.watchOuts.map((h, i) => (
                      <li key={i} className="text-sm text-ink-2">
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ins.suggestions.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-coral-dark">
                    <Lightbulb className="size-3.5" /> Suggestions
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {ins.suggestions.map((h, i) => (
                      <li key={i} className="text-sm text-ink-2">
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
