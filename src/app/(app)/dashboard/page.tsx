"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { HeartPulse, Scale, Moon, Droplet, MessagesSquare, ScanHeart, Activity } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useVitals } from "@/hooks/useVitals";
import { useMedications } from "@/hooks/useMedications";
import { useJournal } from "@/hooks/useJournal";
import { useInsights } from "@/hooks/useSymptomChecks";
import { computeHealthScore } from "@/lib/healthScore";
import { StatCard } from "@/components/dashboard/StatCard";
import { UpcomingMeds } from "@/components/dashboard/UpcomingMeds";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { generateWeeklyInsight } from "@/lib/aiClient";
import { saveInsight } from "@/lib/firebase/repo";
import type { VitalType } from "@/types";

const HealthOrb = dynamic(() => import("@/components/three/HealthOrb"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse-slow rounded-full bg-sage-light" />,
});

function latestOf(vitals: ReturnType<typeof useVitals>["vitals"], type: VitalType) {
  return vitals.find((v) => v.type === type);
}

export default function DashboardPage() {
  const { user, profile, getIdToken } = useAuth();
  const { vitals } = useVitals();
  const { medications } = useMedications();
  const { entries: journal } = useJournal();
  const { insights } = useInsights();

  const health = computeHealthScore(vitals, journal, medications);
  const hr = latestOf(vitals, "heart_rate");
  const bp = latestOf(vitals, "blood_pressure");
  const sleep = latestOf(vitals, "sleep");
  const glucose = latestOf(vitals, "blood_glucose");

  async function handleGenerateInsight() {
    if (!user) return;
    const token = await getIdToken();
    if (!token) return;
    const result = await generateWeeklyInsight(token, vitals.slice(0, 40), journal.slice(0, 20));
    await saveInsight(user.uid, {
      period: "weekly",
      rangeStart: new Date(Date.now() - 7 * 86400000).toISOString(),
      rangeEnd: new Date().toISOString(),
      ...result,
    });
  }

  const firstName = (profile?.displayName || user?.displayName || "there").split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Hi {firstName} 👋</h1>
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
          <StatCard
            icon={HeartPulse}
            label="Heart rate"
            value={hr ? String(hr.value) : "—"}
            unit={hr ? "bpm" : undefined}
            tone={hr ? "sage" : "neutral"}
            sub={hr ? "Latest reading" : "Not logged yet"}
          />
          <StatCard
            icon={Activity}
            label="Blood pressure"
            value={bp ? `${bp.value}/${bp.secondaryValue ?? "–"}` : "—"}
            unit={bp ? "mmHg" : undefined}
            tone={bp ? "sage" : "neutral"}
            sub={bp ? "Latest reading" : "Not logged yet"}
          />
          <StatCard
            icon={Moon}
            label="Sleep"
            value={sleep ? String(sleep.value) : "—"}
            unit={sleep ? "hrs" : undefined}
            tone={sleep ? "sage" : "neutral"}
            sub={sleep ? "Last night" : "Not logged yet"}
          />
          <StatCard
            icon={Droplet}
            label="Blood glucose"
            value={glucose ? String(glucose.value) : "—"}
            unit={glucose ? "mg/dL" : undefined}
            tone={glucose ? "sage" : "neutral"}
            sub={glucose ? "Latest reading" : "Not logged yet"}
          />
        </div>
      </div>

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
