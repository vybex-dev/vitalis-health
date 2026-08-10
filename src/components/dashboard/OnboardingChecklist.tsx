"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { VitalReading, JournalEntry, HealthDocument, SymptomCheck } from "@/types";

export function OnboardingChecklist({
  profileOnboarded,
  vitals,
  journal,
  documents,
  symptomChecks,
}: {
  profileOnboarded: boolean;
  vitals: VitalReading[];
  journal: JournalEntry[];
  documents: HealthDocument[];
  symptomChecks: SymptomCheck[];
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem("vitalis_onboarding_dismissed");
    if (isDismissed) setDismissed(true);
  }, []);

  const steps = [
    {
      id: "profile",
      label: "Complete health profile",
      done: profileOnboarded,
      href: "/profile",
    },
    {
      id: "vital",
      label: "Log your first vital reading",
      done: vitals.length > 0,
      href: "/vitals",
    },
    {
      id: "chat",
      label: "Ask the AI Copilot a question",
      done: true, // Auto done once they visit dashboard or chat
      href: "/chat",
    },
    {
      id: "journal",
      label: "Record a journal entry",
      done: journal.length > 0,
      href: "/journal",
    },
    {
      id: "doc",
      label: "Upload a lab report or prescription",
      done: documents.length > 0,
      href: "/documents",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const isAllComplete = completedCount === steps.length;

  if (dismissed || isAllComplete) return null;

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("vitalis_onboarding_dismissed", "true");
  }

  return (
    <Card className="relative p-5 bg-gradient-to-r from-teal-deep/5 via-white to-coral-light/20 border-coral/20">
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-ink-soft hover:text-ink transition-colors"
        aria-label="Dismiss checklist"
      >
        <X className="size-4" />
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="font-display text-base font-semibold text-ink">
            Getting Started with Vitalis 👋
          </h3>
          <p className="text-xs text-ink-soft mt-0.5">
            Complete these setup steps to get personalized health insights. ({completedCount}/{steps.length})
          </p>
        </div>
        <div className="w-full sm:w-32 bg-porcelain-2 h-2 rounded-full overflow-hidden">
          <div
            className="bg-coral h-full transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
              step.done
                ? "bg-sage-light/40 border-sage/20 text-sage-dark"
                : "bg-white border-border hover:border-coral/40 text-ink-2"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {step.done ? (
                <CheckCircle2 className="size-4 text-sage shrink-0" />
              ) : (
                <Circle className="size-4 text-ink-soft shrink-0" />
              )}
              <span className={`truncate font-medium ${step.done ? "line-through opacity-80" : ""}`}>
                {step.label}
              </span>
            </div>
            {!step.done && <ArrowRight className="size-3.5 text-ink-soft shrink-0" />}
          </Link>
        ))}
      </div>
    </Card>
  );
}
