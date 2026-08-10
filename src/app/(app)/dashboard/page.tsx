"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { HeartPulse, Scale, Moon, Droplet, MessagesSquare, ScanHeart, Activity } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useVitals } from "@/hooks/useVitals";
import { useMedications } from "@/hooks/useMedications";
import { useJournal } from "@/hooks/useJournal";
import { useInsights, useSymptomChecks } from "@/hooks/useSymptomChecks";
import { useHealthDocuments } from "@/hooks/useHealthDocuments";
import { computeHealthScore } from "@/lib/healthScore";
import { StatCard } from "@/components/dashboard/StatCard";
import { UpcomingMeds } from "@/components/dashboard/UpcomingMeds";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { HealthScoreBreakdown } from "@/components/dashboard/HealthScoreBreakdown";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonStatCard } from "@/components/ui/Skeleton";
import { generateWeeklyInsight } from "@/lib/aiClient";
import { saveInsight } from "@/lib/firebase/repo";
import { toast } from "@/store/toastStore";
import { formatRelative } from "@/lib/utils";
import type { VitalType, VitalReading } from "@/types";

const HealthOrb = dynamic(() => import("@/components/three/HealthOrb"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse-slow rounded-full bg-sage-light" />,
});

function getVitalStats(vitals: VitalReading[], type: VitalType) {
  const filtered = vitals.filter((v) => v.type === type);
  return {
    latest: filtered[0],
    previous: filtered[1],
  };
}

export default function DashboardPage() {
  const { user, profile, getIdToken } = useAuth();
  const { vitals, loading: vitalsLoading } = useVitals();
  const { medications, loading: medsLoading } = useMedications();
  const { entries: journal } = useJournal();
  const { insights } = useInsights();
  const { documents } = useHealthDocuments();
  const { checks: symptomChecks } = useSymptomChecks();

  const health = computeHealthScore(vitals, journal, medications);
  
  const hr = getVitalStats(vitals, "heart_rate");
  const bp = getVitalStats(vitals, "blood_pressure");
  const sleep = getVitalStats(vitals, "sleep");
  const glucose = getVitalStats(vitals, "blood_glucose");

  async function handleGenerateInsight() {
    if (!user) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      const result = await generateWeeklyInsight(token, vitals.slice(0, 40), journal.slice(0, 20));
      await saveInsight(user.uid, {
        period: "weekly",
        rangeStart: new Date(Date.now() - 7 * 86400000).toISOString(),
        rangeEnd: new Date().toISOString(),
        ...result,
      });
      toast.success("New health insight generated!");
    } catch {
      toast.error("Could not generate insight right now.");
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (profile?.displayName || user?.displayName || "there").split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            {greeting}, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Here&apos;s where things stand today.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/chat">
            <Button variant="outline" size="sm">
              <MessagesSquare className="size-4" /> Ask copilot
            </Button>
          </Link>
          <Link href="/symptom-checker">
            <Button size="sm">
              <ScanHeart className="size-4" /> Check a symptom
            </Button>
          </Link>
        </div>
      </div>

      <OnboardingChecklist
        profileOnboarded={!!profile?.onboarded}
        vitals={vitals}
        journal={journal}
        documents={documents}
        symptomChecks={symptomChecks}
      />

      <StreakCard vitals={vitals} journal={journal} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center p-6 lg:col-span-1">
          <div className="size-36">
            <HealthOrb tone={health.label} />
          </div>
          <p className="mt-2 font-data text-3xl font-semibold text-ink">{health.score}</p>
          <p className="text-xs uppercase tracking-wide text-ink-soft">Health score</p>
          <ul className="mt-4 w-full space-y-1.5 text-left">
            {health.factors.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-ink-soft">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-sage" />
                {f}
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          {vitalsLoading ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <StatCard
                icon={HeartPulse}
                label="Heart rate"
                value={hr.latest ? String(hr.latest.value) : "—"}
                unit={hr.latest ? "bpm" : undefined}
                tone={hr.latest ? "sage" : "neutral"}
                sub={hr.latest ? `${formatRelative(hr.latest.recordedAt)} · Latest reading` : "Not logged yet"}
                previousValue={hr.previous?.value}
              />
              <StatCard
                icon={Activity}
                label="Blood pressure"
                value={bp.latest ? `${bp.latest.value}/${bp.latest.secondaryValue ?? "–"}` : "—"}
                unit={bp.latest ? "mmHg" : undefined}
                tone={bp.latest ? "sage" : "neutral"}
                sub={bp.latest ? `${formatRelative(bp.latest.recordedAt)} · Latest reading` : "Not logged yet"}
                previousValue={bp.previous?.value}
              />
              <StatCard
                icon={Moon}
                label="Sleep"
                value={sleep.latest ? String(sleep.latest.value) : "—"}
                unit={sleep.latest ? "hrs" : undefined}
                tone={sleep.latest ? "sage" : "neutral"}
                sub={sleep.latest ? `${formatRelative(sleep.latest.recordedAt)} · Last logged` : "Not logged yet"}
                previousValue={sleep.previous?.value}
              />
              <StatCard
                icon={Droplet}
                label="Blood glucose"
                value={glucose.latest ? String(glucose.latest.value) : "—"}
                unit={glucose.latest ? "mg/dL" : undefined}
                tone={glucose.latest ? "sage" : "neutral"}
                sub={glucose.latest ? `${formatRelative(glucose.latest.recordedAt)} · Latest reading` : "Not logged yet"}
                previousValue={glucose.previous?.value}
              />
            </>
          )}
        </div>
      </div>

      <HealthScoreBreakdown vitals={vitals} journal={journal} medications={medications} />

      <div className="grid gap-5 lg:grid-cols-2">
        <UpcomingMeds medications={medications} />
        <InsightCard latest={insights[0]} onGenerate={handleGenerateInsight} />
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <Scale className="size-5 text-ink-soft" />
          <p className="text-sm text-ink-2">Haven&apos;t logged a vital today? It only takes a few seconds.</p>
        </div>
        <Link href="/vitals">
          <Button variant="outline" size="sm">
            Log a vital
          </Button>
        </Link>
      </Card>
    </div>
  );
}
