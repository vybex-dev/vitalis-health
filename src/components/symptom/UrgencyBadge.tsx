import { Badge } from "@/components/ui/Badge";
import { URGENCY_META } from "@/types";
import type { UrgencyLevel } from "@/types";

export function UrgencyBadge({ level }: { level: UrgencyLevel }) {
  const meta = URGENCY_META[level];
  const tone = level === "emergency" ? "alert" : level === "self_care" ? "sage" : "amber";
  return <Badge tone={tone}>{meta.label}</Badge>;
}
