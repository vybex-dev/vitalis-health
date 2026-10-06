"use client";

import { useEffect, useState } from "react";
import { Languages, Volume2, VolumeX, Sparkles, MessageCircleQuestion, TriangleAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/lib/auth/AuthContext";
import { explainReport } from "@/lib/aiClient";
import { updateHealthDocument } from "@/lib/firebase/repo";
import { LANGUAGES, languageByCode } from "@/lib/ai/languages";
import { cn } from "@/lib/utils";
import type { ExtractedLabValue, ReadingLevel, ReportExplanation } from "@/types";

function explanationToSpeech(e: ReportExplanation): string {
  return [
    e.headline,
    ...e.keyPoints,
    ...e.items.map((i) => `${i.testName}. ${i.whatItMeasures} ${i.whatItMeans}`),
    e.whenToSeekCareSooner,
  ]
    .filter(Boolean)
    .join(" ");
}

export function LabExplainer({
  documentId,
  labValues,
  saved,
}: {
  documentId: string;
  labValues: ExtractedLabValue[];
  saved?: ReportExplanation | null;
}) {
  const { user, getIdToken } = useAuth();
  const [language, setLanguage] = useState(saved?.language ?? "en");
  const [level, setLevel] = useState<ReadingLevel>(saved?.readingLevel ?? "simple");
  const [explanation, setExplanation] = useState<ReportExplanation | null>(saved ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  async function generate() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      const result = await explainReport(token, { labValues, language, readingLevel: level });
      setExplanation(result);
      await updateHealthDocument(user.uid, documentId, { explanation: result }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate the explanation.");
    } finally {
      setBusy(false);
    }
  }

  function toggleSpeech() {
    if (!canSpeak || !explanation) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(explanationToSpeech(explanation));
    utter.lang = languageByCode(explanation.language).speech;
    utter.rate = 0.95;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  }

  const rtl = explanation ? languageByCode(explanation.language).rtl : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-coral" /> Explain this report in plain language
        </CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        <p className="mb-4 text-sm text-ink-soft">
          Pick your language and reading level. Only the values already flagged low or high are explained, using the flags verified above.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-40">
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-soft">
              <Languages className="size-3.5" /> Language
            </label>
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label} ({l.english})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex rounded-xl border border-border-strong p-0.5" role="group" aria-label="Reading level">
            {(["simple", "standard"] as ReadingLevel[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                aria-pressed={level === l}
                className={cn("rounded-lg px-3 py-2 text-xs font-medium transition-colors", level === l ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}
              >
                {l === "simple" ? "Simple" : "Standard"}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={generate} loading={busy}>
            {explanation ? "Regenerate" : "Explain it"}
          </Button>
        </div>

        {error && <p className="mt-3 text-sm text-alert">{error}</p>}

        {explanation && (
          <div className="mt-5 flex flex-col gap-4" dir={rtl ? "rtl" : "ltr"} lang={explanation.language}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-display text-lg font-semibold leading-snug text-ink">{explanation.headline}</p>
              {canSpeak && (
                <Button variant="outline" size="sm" onClick={toggleSpeech} aria-label={speaking ? "Stop reading aloud" : "Read aloud"}>
                  {speaking ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                  {speaking ? "Stop" : "Read aloud"}
                </Button>
              )}
            </div>

            {explanation.keyPoints.length > 0 && (
              <ul className="list-disc space-y-1 ps-5 text-sm text-ink-2">
                {explanation.keyPoints.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            )}

            {explanation.items.map((item) => (
              <div key={item.testName} className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold text-ink">{item.testName}</p>
                <p className="mt-1 text-sm text-ink-2">{item.whatItMeasures}</p>
                <p className="mt-2 text-sm text-ink-2">{item.whatItMeans}</p>
                {item.questionsToAsk.length > 0 && (
                  <p className="mt-2 text-xs text-ink-soft">
                    <MessageCircleQuestion className="me-1 inline size-3.5" />
                    {item.questionsToAsk.join(" · ")}
                  </p>
                )}
              </div>
            ))}

            {explanation.questionsForDoctor.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-coral">Questions for your doctor</p>
                <ol className="list-decimal space-y-1 ps-5 text-sm text-ink-2">
                  {explanation.questionsForDoctor.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </div>
            )}

            {explanation.whenToSeekCareSooner && (
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-light p-3.5">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-dark" />
                <p className="text-sm text-amber-dark">{explanation.whenToSeekCareSooner}</p>
              </div>
            )}

            <p className="text-xs italic text-ink-soft">
              AI-generated general information, not a diagnosis. Translations should be double-checked, and only your clinician can interpret your results.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
