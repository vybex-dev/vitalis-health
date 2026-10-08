// src/app/(app)/visit-prep/page.tsx: Doctor visit preparation page that builds a brief and suggested questions.
"use client";

import { useMemo, useState } from "react";
import { Copy, Printer, Sparkles, TrendingUp, TrendingDown, Minus, Pill, FlaskConical, HeartPulse } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useVitals } from "@/hooks/useVitals";
import { useMedications } from "@/hooks/useMedications";
import { useLabResults } from "@/hooks/useLabResults";
import { useSymptomChecks } from "@/hooks/useSymptomChecks";
import { useJournal } from "@/hooks/useJournal";
import { buildVisitBrief, briefToText } from "@/lib/visitBrief";
import { generateVisitQuestions } from "@/lib/aiClient";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { toast } from "@/store/toastStore";
import { formatDate } from "@/lib/utils";

function TrendIcon({ d }: { d: string }) {
  if (d === "up") return <TrendingUp className="size-4 text-amber-dark" aria-label="trending up" />;
  if (d === "down") return <TrendingDown className="size-4 text-sage-dark" aria-label="trending down" />;
  return <Minus className="size-4 text-ink-soft" aria-label={d === "stable" ? "stable" : "not enough data"} />;
}

export default function VisitPrepPage() {
  const { profile, getIdToken } = useAuth();
  const { vitals, loading: l1 } = useVitals();
  const { medications, loading: l2 } = useMedications();
  const { results: labResults, loading: l3 } = useLabResults();
  const { checks, loading: l4 } = useSymptomChecks();
  const { entries: journal, loading: l5 } = useJournal();

  const [reason, setReason] = useState("");
  const [now] = useState(() => new Date());
  const [questions, setQuestions] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const brief = useMemo(
    () =>
      buildVisitBrief(
        { profile, vitals, medications, labResults, symptomChecks: checks, journal, reasonForVisit: reason },
        now,
      ),
    [profile, vitals, medications, labResults, checks, journal, reason, now],
  );

  if (l1 || l2 || l3 || l4 || l5) return <FullPageSpinner label="Gathering your last 30 days…" />;

  async function handleQuestions() {
    setBusy(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      const r = await generateVisitQuestions(token, brief);
      setQuestions(r.questions);
      setTopics(r.topicsToRaise);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't generate questions.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(briefToText(brief, questions));
      toast.success("Copied. Paste it into a message or patient portal.");
    } catch {
      toast.error("Couldn't copy. Use Print instead.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Visit prep</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            Your last 30 days on one page, so you can say what matters in the few minutes you have. Facts are computed from your own logs, and nothing here is invented by AI.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="size-3.5" /> Copy as text
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" /> Print / save PDF
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardBody className="flex flex-wrap items-end gap-3 pt-5">
          <div className="min-w-64 flex-1">
            <Input label="What's this visit about? (optional)" placeholder="e.g. Blood pressure follow-up" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={140} />
          </div>
          <Button variant="outline" onClick={handleQuestions} loading={busy}>
            <Sparkles className="size-4 text-coral" /> Suggest questions to ask
          </Button>
        </CardBody>
      </Card>

      {/* ---------- the brief (this is what prints) ---------- */}
      <article className="flex flex-col gap-4 print:gap-3" aria-label="Visit brief">
        <div className="hidden print:block">
          <h1 className="font-display text-2xl font-semibold">Visit brief</h1>
          <p className="text-xs text-ink-soft">Prepared {formatDate(brief.generatedAt)} with Vitalis. Self-reported data, not a medical record.</p>
        </div>

        <Card>
          <CardBody className="pt-5">
            <p className="font-display text-lg font-semibold text-ink">
              {brief.patient.name}
              {brief.patient.age !== undefined && <span className="font-normal text-ink-soft">, {brief.patient.age}</span>}
              {brief.patient.sex && <span className="font-normal capitalize text-ink-soft"> · {brief.patient.sex}</span>}
            </p>
            {brief.reasonForVisit && <p className="mt-1 text-sm text-ink-2">Reason for visit: {brief.reasonForVisit}</p>}
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <p><span className="font-medium text-ink">Conditions:</span> <span className="text-ink-2">{brief.patient.conditions.join(", ") || "none listed"}</span></p>
              <p><span className="font-medium text-ink">Allergies:</span> <span className="text-ink-2">{brief.patient.allergies.join(", ") || "none listed"}</span></p>
              {brief.patient.emergencyContact && <p className="sm:col-span-2"><span className="font-medium text-ink">Emergency contact:</span> <span className="text-ink-2">{brief.patient.emergencyContact}</span></p>}
            </div>
          </CardBody>
        </Card>

        {brief.discussionPoints.length > 0 && (
          <Card className="border-coral/30">
            <CardHeader><CardTitle>Worth discussing</CardTitle></CardHeader>
            <CardBody className="pt-0">
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2">
                {brief.discussionPoints.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </CardBody>
          </Card>
        )}

        {(questions.length > 0 || topics.length > 0) && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-coral" /> Questions to ask</CardTitle></CardHeader>
            <CardBody className="pt-0">
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-2">{questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
              {topics.length > 0 && <p className="mt-3 text-xs text-ink-soft">Also consider raising: {topics.join(" · ")}</p>}
              <p className="mt-3 text-[11px] italic text-ink-soft">AI-suggested from the data above. Edit freely, and your clinician decides what matters.</p>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Pill className="size-4 text-coral" /> Current medications</CardTitle></CardHeader>
          <CardBody className="pt-0">
            {brief.medications.length === 0 ? <p className="text-sm text-ink-soft">None listed.</p> : (
              <ul className="divide-y divide-border text-sm">
                {brief.medications.map((m, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="font-medium text-ink">{m.name} <span className="font-normal text-ink-2">{m.dosage}</span></span>
                    <span className="text-ink-soft">{m.frequency}{m.instructions ? ` · ${m.instructions}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><HeartPulse className="size-4 text-coral" /> Vitals, last 30 days</CardTitle></CardHeader>
          <CardBody className="pt-0">
            {brief.vitals.length === 0 ? <p className="text-sm text-ink-soft">No readings logged in the last 30 days.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-ink-soft"><tr><th className="py-1.5 pr-3 font-medium">Vital</th><th className="pr-3 font-medium">Latest</th><th className="pr-3 font-medium">Avg</th><th className="pr-3 font-medium">Range</th><th className="pr-3 font-medium">Trend</th><th className="font-medium">Out of range</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {brief.vitals.map((v) => (
                      <tr key={v.type}>
                        <td className="py-2 pr-3 font-medium text-ink">{v.label}</td>
                        <td className="pr-3 font-data text-ink-2">{v.type === "blood_pressure" && v.latestSecondary ? `${v.latest}/${v.latestSecondary}` : v.latest} <span className="text-xs text-ink-soft">{v.unit}</span></td>
                        <td className="pr-3 font-data text-ink-2">{v.mean}</td>
                        <td className="pr-3 font-data text-ink-2">{v.min}–{v.max}</td>
                        <td className="pr-3"><span className="inline-flex items-center gap-1 text-xs text-ink-2"><TrendIcon d={v.direction} />{v.direction === "insufficient" ? "n/a" : v.changePct !== null ? `${v.changePct > 0 ? "+" : ""}${v.changePct}%` : ""}</span></td>
                        <td className="text-ink-2">{v.hasRange ? `${v.outOfRange}/${v.count}` : "n/a"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="size-4 text-coral" /> Flagged lab results</CardTitle></CardHeader>
          <CardBody className="pt-0">
            {brief.flaggedLabs.length === 0 ? <p className="text-sm text-ink-soft">No low or high results on file.</p> : (
              <ul className="divide-y divide-border text-sm">
                {brief.flaggedLabs.map((l) => (
                  <li key={l.testName} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="font-medium text-ink">{l.testName}</span>
                    <span className="flex items-center gap-2 text-ink-2">
                      <span className="font-data">{l.value} {l.unit}</span>
                      {l.previousValue && <span className="text-xs text-ink-soft">(was {l.previousValue})</span>}
                      <Badge tone="amber">{l.flag}</Badge>
                      <span className="text-xs text-ink-soft">ref {l.referenceRange || "n/a"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {(brief.mood || brief.recentSymptomChecks.length > 0) && (
          <Card>
            <CardHeader><CardTitle>Symptoms & mood</CardTitle></CardHeader>
            <CardBody className="pt-0 text-sm text-ink-2">
              {brief.mood && (
                <p>
                  {brief.mood.entries} journal entries, average mood <strong>{brief.mood.averageMood}/5</strong>.
                  {brief.mood.topSymptoms.length > 0 && <> Most logged: {brief.mood.topSymptoms.map((s) => `${s.symptom} (${s.count}×)`).join(", ")}.</>}
                </p>
              )}
              {brief.recentSymptomChecks.map((c, i) => (
                <p key={i} className="mt-1.5">{c.date}, {c.bodyRegion}: rated <strong>{c.urgency.replace("_", " ")}</strong>. {c.summary}</p>
              ))}
            </CardBody>
          </Card>
        )}
      </article>
    </div>
  );
}
