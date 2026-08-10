import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-white p-10 text-center", className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-porcelain-2 text-ink-soft">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-display text-sm font-semibold text-ink">{title}</p>
        {description && <p className="mt-1 text-xs text-ink-soft">{description}</p>}
      </div>
      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
