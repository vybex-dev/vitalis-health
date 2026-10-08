// src/components/ui/ProvenanceBadge.tsx: Badge indicating where a piece of data came from.
import { ShieldCheck, ShieldAlert, ShieldQuestion, BookMarked, Bot } from "lucide-react";
import { Badge } from "./Badge";

export type Provenance = "verified" | "corrected" | "unverifiable" | "fda_label" | "ai_only";

const META: Record<Provenance, { label: string; tone: "sage" | "amber" | "alert" | "neutral"; Icon: typeof ShieldCheck; title: string }> = {
  verified: { label: "Checked against range", tone: "sage", Icon: ShieldCheck, title: "Code re-checked this flag against the reference range printed on your report." },
  corrected: { label: "Flag corrected", tone: "amber", Icon: ShieldAlert, title: "The AI's flag disagreed with the printed range, so the range-based flag was used." },
  unverifiable: { label: "Not auto-checked", tone: "neutral", Icon: ShieldQuestion, title: "No simple numeric range to check against. Please verify against your report." },
  fda_label: { label: "From FDA label", tone: "sage", Icon: BookMarked, title: "Evidence is text retrieved from an FDA-approved drug label." },
  ai_only: { label: "AI only · unverified", tone: "alert", Icon: Bot, title: "Not grounded in a source. Confirm with a pharmacist." },
};

export function ProvenanceBadge({ kind, className }: { kind: Provenance; className?: string }) {
  const { label, tone, Icon, title } = META[kind];
  return (
    <span title={title} className={className}>
      <Badge tone={tone} className="gap-1 px-2 py-0.5 text-[11px]">
        <Icon className="size-3" aria-hidden /> {label}
      </Badge>
    </span>
  );
}
