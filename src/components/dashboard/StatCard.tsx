import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  tone = "neutral",
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  tone?: "sage" | "amber" | "alert" | "neutral";
  sub?: string;
}) {
  const toneClasses: Record<string, string> = {
    sage: "bg-sage-light text-sage-dark",
    amber: "bg-amber-light text-amber-dark",
    alert: "bg-alert-light text-alert-dark",
    neutral: "bg-porcelain-2 text-ink-2",
  };

  return (
    <Card className="p-5">
      <div className={cn("mb-3 flex size-9 items-center justify-center rounded-lg", toneClasses[tone])}>
        <Icon className="size-4.5" />
      </div>
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 font-data text-2xl font-medium text-ink">
        {value}
        {unit && <span className="ml-1 text-sm text-ink-soft">{unit}</span>}
      </p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </Card>
  );
}
