"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, ArrowLeft, ArrowRight, Phone, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { UrgencyBadge } from "@/components/symptom/UrgencyBadge";
import { useAuth } from "@/lib/auth/AuthContext";
import { useSymptomChecks } from "@/hooks/useSymptomChecks";
import { runSymptomCheck } from "@/lib/aiClient";
import { saveSymptomCheck } from "@/lib/firebase/repo";
import { BODY_REGIONS } from "@/components/three/BodyMap";
import type { SymptomCheck } from "@/types";
import { cn, formatRelative } from "@/lib/utils";

const BodyMap = dynamic(() => import("@/components/three/BodyMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-ink-soft">Loading model…</div>,
});

type Step = "region" | "details" | "result";

export default function SymptomCheckerPage() {
  const { user, getIdToken } = useAuth();
  const { checks } = useSymptomChecks();

  const [step, setStep] = useState<Step>("region");
  const [region, setRegion] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState(4);
  const [durationValue, setDurationValue] = useState(3);
  const [durationUnit, setDurationUnit] = useState<"hours" | "days">("hours");
  const [freeText, setFreeText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SymptomCheck["assessment"] | null>(null);

  const regionLabel = BODY_REGIONS.find((r) => r.id === region)?.label;

  async function handleSubmit() {
    if (!user || !region) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      const durationHours = durationUnit === "days" ? durationValue * 24 : durationValue;
      const symptomList = symptoms
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const assessment = await runSymptomCheck(token, {
        bodyRegion: regionLabel || region,
        symptoms: symptomList,
        severity,
        durationHours,
        freeText,
      });

      setResult(assessment);
      setStep("result");

      await saveSymptomCheck(user.uid, {
        bodyRegion: regionLabel || region,
        symptoms: symptomList,
        severity,
        durationHours,
        freeText,
        assessment,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't complete the check.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep("region");
    setRegion(null);
    setSymptoms("");
    setSeverity(4);
    setDurationValue(3);
    setDurationUnit("hours");
    setFreeText("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Symptom checker</h1>
        <p className="mt-1 text-sm text-ink-soft">
          General guidance based on what you describe — not a diagnosis. For emergencies, use the Emergency button.
        </p>
      </div>

      {step === "region" && (
        <Card className="overflow-hidden">
          <div className="h-[26rem] sm:h-[30rem]">
            <BodyMap selected={region} onSelect={setRegion} />
          </div>
          <div className="flex items-center justify-between border-t border-border p-4">
            <p className="text-sm text-ink-soft">{region ? `Selected: ${regionLabel}` : "Tap a body region to begin"}</p>
            <Button disabled={!region} onClick={() => setStep("details")}>
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === "details" && (
        <Card className="p-6">
          <button
            onClick={() => setStep("region")}
            className="mb-4 flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
          >
            <ArrowLeft className="size-3.5" /> Change region
          </button>

          <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">Region</p>
          <p className="mb-5 font-display text-lg font-semibold text-ink">{regionLabel}</p>

          <div className="flex flex-col gap-4">
            <Input
              label="Symptoms (comma separated)"
              placeholder="e.g. sharp pain, tightness, tingling"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-2">
                Severity: <span className="font-data">{severity}/10</span>
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full accent-coral"
              />
            </div>

            <div className="flex items-end gap-3">
              <Input
                label="Duration"
                type="number"
                min={0}
                value={durationValue}
                onChange={(e) => setDurationValue(Number(e.target.value))}
                className="max-w-32"
              />
              <div className="flex gap-1.5 pb-0.5">
                {(["hours", "days"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setDurationUnit(u)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-medium",
                      durationUnit === u ? "border-ink bg-ink text-white" : "border-border-strong text-ink-2"
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              label="Anything else? (optional)"
              placeholder="What makes it better or worse, when it started, etc."
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
            />

            {error && <p className="text-sm text-alert">{error}</p>}

            <Button onClick={handleSubmit} loading={busy} disabled={!symptoms.trim()} className="w-full justify-center">
              Get guidance
            </Button>
          </div>
        </Card>
      )}

      {step === "result" && result && (
        <div className="flex flex-col gap-4">
          <Card className={cn("p-6", result.urgency === "emergency" && "border-alert")}>
            <div className="mb-3 flex items-center justify-between">
              <UrgencyBadge level={result.urgency} />
              {result.urgency === "emergency" && <AlertTriangle className="size-5 text-alert" />}
            </div>

            {result.urgency === "emergency" && (
              <a href="tel:911" className="mb-4 block">
                <Button variant="danger" className="w-full justify-center">
                  <Phone className="size-4" /> Call emergency services now
                </Button>
              </a>
            )}

            <p className="text-sm leading-relaxed text-ink-2">{result.summary}</p>

            {result.possibleFactors.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Can sometimes relate to</p>
                <ul className="flex flex-col gap-1.5">
                  {result.possibleFactors.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-soft" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.redFlags.length > 0 && (
              <div className="mt-5 rounded-xl bg-alert-light p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-alert-dark">Watch for</p>
                <ul className="flex flex-col gap-1.5">
                  {result.redFlags.map((f, i) => (
                    <li key={i} className="text-sm text-alert-dark">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.selfCareTips.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Self-care</p>
                <ul className="flex flex-col gap-1.5">
                  {result.selfCareTips.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-sage" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-5 text-xs italic text-ink-soft">{result.disclaimer}</p>
          </Card>

          <Button variant="outline" onClick={reset} className="w-full justify-center">
            <RotateCcw className="size-4" /> Check something else
          </Button>
        </div>
      )}

      {checks.length > 0 && step === "region" && (
        <div>
          <h2 className="mb-3 font-display text-base font-semibold text-ink-soft">Past checks</h2>
          <div className="flex flex-col gap-2">
            {checks.slice(0, 5).map((c) => (
              <Card key={c.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-ink">{c.bodyRegion}</p>
                  <p className="text-xs text-ink-soft">
                    {c.symptoms.join(", ")} · {formatRelative(c.createdAt)}
                  </p>
                </div>
                <UrgencyBadge level={c.assessment.urgency} />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
