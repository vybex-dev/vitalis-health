import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

function TrendBadge({ delta, unit }: { delta: number; unit?: string }) {
  if (delta === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-ink-soft">
        <Minus className="size-3" /> Unchanged
      </span>
    );
  }
  const isUp = delta > 0;
  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-medium", isUp ? "text-sage-dark" : "text-alert-dark")}>
      {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {isUp ? "+" : ""}{Math.abs(delta).toFixed(delta % 1 === 0 ? 0 : 1)}{unit ?? ""}
    </span>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  tone = "neutral",
  sub,
  previousValue,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  tone?: "sage" | "amber" | "alert" | "neutral";
  sub?: string;
  previousValue?: number;
}) {
  const toneClasses: Record<string, string> = {
    sage: "bg-sage-light text-sage-dark",
    amber: "bg-amber-light text-amber-dark",
    alert: "bg-alert-light text-alert-dark",
    neutral: "bg-porcelain-2 text-ink-2",
  };

  const numericValue = parseFloat(value);
  const showTrend = previousValue !== undefined && !isNaN(numericValue) && value !== "—";

  return (
    <Card className="p-5 transition-shadow hover:shadow-[var(--shadow-card)]">
      <div className={cn("mb-3 flex size-9 items-center justify-center rounded-lg", toneClasses[tone])}>
        <Icon className="size-4.5" />
      </div>
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 font-data text-2xl font-medium text-ink">
        {value}
        {unit && <span className="ml-1 text-sm text-ink-soft">{unit}</span>}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        {sub && <p className="text-xs text-ink-soft">{sub}</p>}
        {showTrend && (
          <TrendBadge delta={numericValue - previousValue!} unit={unit} />
        )}
      </div>
    </Card>
  );
}
