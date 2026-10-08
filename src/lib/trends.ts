// src/lib/trends.ts: Vital trend calculations.
import { VITAL_META } from "@/types";
import type { VitalReading, VitalType } from "@/types";

// Deterministic trend statistics. These numbers are computed in code and handed
// to the AI as facts, so the model can phrase them but never invent them.

export type TrendDirection = "up" | "down" | "stable" | "insufficient";

export interface VitalTrend {
  type: VitalType;
  label: string;
  unit: string;
  count: number;
  latest: number;
  latestSecondary?: number;
  latestAt: string;
  min: number;
  max: number;
  mean: number;
  direction: TrendDirection;
  /** Fitted change across the window as a % of the mean (null when insufficient data). */
  changePct: number | null;
  /** Readings outside VITAL_META's typical range (0 when the type has no range). */
  outOfRange: number;
  hasRange: boolean;
}

const DAY_MS = 86_400_000;

/** What counts as "no real change" differs by vital: 1% of body temperature is a big deal, 1% of steps isn't. */
const STABLE_BAND_PCT: Partial<Record<VitalType, number>> = {
  temperature: 1,
  spo2: 1,
  blood_pressure: 4,
  heart_rate: 6,
};
const DEFAULT_STABLE_BAND_PCT = 5;

/** Least-squares slope of y over x. Returns 0 when x has no spread. */
export function linearSlope(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

export function summarizeVitals(
  vitals: VitalReading[],
  opts: { days?: number; now: number },
): VitalTrend[] {
  const days = opts.days ?? 30;
  const cutoff = opts.now - days * DAY_MS;
  const byType = new Map<VitalType, VitalReading[]>();

  for (const v of vitals) {
    const t = new Date(v.recordedAt).getTime();
    if (!Number.isFinite(t) || t < cutoff || t > opts.now + DAY_MS) continue;
    const list = byType.get(v.type) ?? [];
    list.push(v);
    byType.set(v.type, list);
  }

  const out: VitalTrend[] = [];
  for (const [type, readings] of byType) {
    const sorted = [...readings].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );
    const meta = VITAL_META[type];
    const values = sorted.map((r) => r.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const first = new Date(sorted[0].recordedAt).getTime();
    const last = new Date(sorted[sorted.length - 1].recordedAt).getTime();
    const spanDays = (last - first) / DAY_MS;

    let direction: TrendDirection = "insufficient";
    let changePct: number | null = null;
    if (sorted.length >= 3 && spanDays >= 2 && mean !== 0) {
      const xs = sorted.map((r) => (new Date(r.recordedAt).getTime() - first) / DAY_MS);
      const slope = linearSlope(xs, values);
      changePct = round(((slope * spanDays) / Math.abs(mean)) * 100);
      const band = STABLE_BAND_PCT[type] ?? DEFAULT_STABLE_BAND_PCT;
      direction = Math.abs(changePct) < band ? "stable" : changePct > 0 ? "up" : "down";
    }

    const range = meta.healthyRange;
    const outOfRange = range ? values.filter((v) => v < range[0] || v > range[1]).length : 0;
    const latest = sorted[sorted.length - 1];

    out.push({
      type,
      label: meta.label,
      unit: meta.unit,
      count: sorted.length,
      latest: latest.value,
      latestSecondary: latest.secondaryValue ?? undefined,
      latestAt: latest.recordedAt,
      min: round(Math.min(...values)),
      max: round(Math.max(...values)),
      mean: round(mean),
      direction,
      changePct,
      outOfRange,
      hasRange: Boolean(range),
    });
  }

  // Stable, meaningful ordering: things that need attention first.
  return out.sort((a, b) => b.outOfRange - a.outOfRange || a.label.localeCompare(b.label));
}
