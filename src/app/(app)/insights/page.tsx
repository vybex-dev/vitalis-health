"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, Eye, Lightbulb, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { useAuth } from "@/lib/auth/AuthContext";
import { useVitals } from "@/hooks/useVitals";
import { useJournal } from "@/hooks/useJournal";
import { useInsights } from "@/hooks/useSymptomChecks";
import { generateWeeklyInsight } from "@/lib/aiClient";
import { saveInsight } from "@/lib/firebase/repo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatRelative } from "@/lib/utils";
import { toast } from "@/store/toastStore";

export default function InsightsPage() {
  const { user, getIdToken } = useAuth();
  const { vitals } = useVitals();
  const { entries: journal } = useJournal();
  const { insights, loading } = useInsights();
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [expandedTrends, setExpandedTrends] = useState<Set<string>>(new Set());

  function toggleTrends(id: string) {
    setExpandedTrends((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGenerate() {
    if (!user) return;
    setBusy(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      const days = period === "weekly" ? 7 : 30;
      const result = await generateWeeklyInsight(token, vitals.slice(0, 50), journal.slice(0, 30));
      await saveInsight(user.uid, {
        period,
        rangeStart: new Date(Date.now() - days * 86400000).toISOString(),
        rangeEnd: new Date().toISOString(),
        ...result,
      });
      toast.success(`Generated new ${period} insight!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't generate insight right now.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const filteredInsights = insights.filter((i) => (i.period ?? "weekly") === period);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Insights</h1>
          <p className="mt-1 text-sm text-ink-soft">AI-generated summaries of what your logged data shows.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border bg-white p-0.5 text-xs font-medium">
            <button
              onClick={() => setPeriod("weekly")}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                period === "weekly" ? "bg-porcelain-2 text-ink font-semibold" : "text-ink-soft hover:text-ink"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                period === "monthly" ? "bg-porcelain-2 text-ink font-semibold" : "text-ink-soft hover:text-ink"
              }`}
            >
              Monthly
            </button>
          </div>
          <Button onClick={handleGenerate} loading={busy}>
            <Sparkles className="size-4" /> Generate {period} insight
          </Button>
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredInsights.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title={`No ${period} insights yet`}
          description="Log a few vitals or journal entries, then generate your first analysis."
          action={{ label: `Generate ${period} insight`, onClick: handleGenerate }}
        />
      )}

      {/* Insight cards */}
      <div className="flex flex-col gap-4">
        {filteredInsights.map((ins, index) => {
          // Period comparison vs previous insight of same type
          const previousIns = filteredInsights[index + 1];
          let deltaIndicator: React.ReactNode = null;
          if (previousIns) {
            const currentWatch = ins.watchOuts.length;
            const prevWatch = previousIns.watchOuts.length;
            if (currentWatch < prevWatch) {
              deltaIndicator = (
                <span className="rounded-full bg-sage-light px-2 py-0.5 text-[10px] font-semibold text-sage-dark">
                  ↑ Improved vs previous
                </span>
              );
            } else if (currentWatch > prevWatch) {
              deltaIndicator = (
                <span className="rounded-full bg-amber-light px-2 py-0.5 text-[10px] font-semibold text-amber-dark">
                  ↓ More watch-outs
                </span>
              );
            } else {
              deltaIndicator = (
                <span className="rounded-full bg-porcelain-2 px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                  → Similar to previous
                </span>
              );
            }
          }

          // Inline trend sparkline data for this insight's date range
          const insightVitals = vitals.filter(
            (v) => v.recordedAt >= ins.rangeStart && v.recordedAt <= ins.rangeEnd
          );
          const hrData = insightVitals
            .filter((v) => v.type === "heart_rate")
            .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
            .map((v) => ({ value: v.value }));
          const sleepData = insightVitals
            .filter((v) => v.type === "sleep")
            .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
            .map((v) => ({ value: v.value }));

          const hasHr = hrData.length >= 2;
          const hasSleep = sleepData.length >= 2;
          const hasTrends = hasHr || hasSleep;
          const isExpanded = expandedTrends.has(ins.id);

          return (
            <Card key={ins.id} className="p-6">
              {/* Card header */}
              <div className="mb-2 flex items-center justify-between border-b border-border pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Calendar className="size-4 text-coral" />
                  <p className="text-xs font-medium uppercase tracking-wide text-ink">
                    {formatDate(ins.rangeStart)} – {formatDate(ins.rangeEnd)}
                  </p>
                  <span className="rounded-full bg-porcelain-2 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-soft">
                    {ins.period ?? "weekly"}
                  </span>
                  {deltaIndicator}
                </div>
                <p className="text-xs text-ink-soft">{formatRelative(ins.generatedAt)}</p>
              </div>

              {/* Summary */}
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{ins.summary}</p>

              {/* Highlights / Watch / Suggestions */}
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {ins.highlights.length > 0 && (
                  <div className="rounded-xl bg-sage-light/30 p-3.5 border border-sage/20">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sage-dark">
                      <TrendingUp className="size-3.5" /> Highlights
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {ins.highlights.map((h, i) => (
                        <li key={i} className="text-xs text-ink-2 flex items-start gap-1.5">
                          <span className="size-1 rounded-full bg-sage shrink-0 mt-1.5" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {ins.watchOuts.length > 0 && (
                  <div className="rounded-xl bg-amber-light/30 p-3.5 border border-amber/20">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-dark">
                      <Eye className="size-3.5" /> Watch
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {ins.watchOuts.map((h, i) => (
                        <li key={i} className="text-xs text-ink-2 flex items-start gap-1.5">
                          <span className="size-1 rounded-full bg-amber shrink-0 mt-1.5" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {ins.suggestions.length > 0 && (
                  <div className="rounded-xl bg-coral-light/30 p-3.5 border border-coral/20">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-coral-dark">
                      <Lightbulb className="size-3.5" /> Suggestions
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {ins.suggestions.map((h, i) => (
                        <li key={i} className="text-xs text-ink-2 flex items-start gap-1.5">
                          <span className="size-1 rounded-full bg-coral shrink-0 mt-1.5" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Collapsible trend sparklines */}
              {hasTrends && (
                <div className="mt-4 border-t border-border pt-3">
                  <button
                    onClick={() => toggleTrends(ins.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )}
                    {isExpanded ? "Hide trends" : "Show trends"}
                  </button>
                  {isExpanded && (
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      {hasHr && (
                        <div className="rounded-xl border border-border bg-porcelain-2/20 p-3">
                          <p className="mb-2 text-xs font-semibold text-ink-2">Heart Rate</p>
                          <div className="h-12 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={hrData}>
                                <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
                                <Line
                                  type="monotone"
                                  dataKey="value"
                                  stroke="var(--color-coral)"
                                  strokeWidth={2}
                                  dot={false}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                      {hasSleep && (
                        <div className="rounded-xl border border-border bg-porcelain-2/20 p-3">
                          <p className="mb-2 text-xs font-semibold text-ink-2">Sleep</p>
                          <div className="h-12 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={sleepData}>
                                <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
                                <Line
                                  type="monotone"
                                  dataKey="value"
                                  stroke="var(--color-sage)"
                                  strokeWidth={2}
                                  dot={false}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
