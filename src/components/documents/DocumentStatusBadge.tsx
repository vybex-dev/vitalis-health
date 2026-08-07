import { Badge } from "@/components/ui/Badge";
import type { DocumentStatus } from "@/types";

const META: Record<DocumentStatus, { label: string; tone: "sage" | "amber" | "alert" | "neutral" }> = {
  processing: { label: "Reading…", tone: "amber" },
  pending_review: { label: "Needs review", tone: "amber" },
  reviewed: { label: "Saved", tone: "sage" },
  discarded: { label: "Discarded", tone: "neutral" },
  failed: { label: "Failed", tone: "alert" },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const meta = META[status] ?? META.processing;
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
