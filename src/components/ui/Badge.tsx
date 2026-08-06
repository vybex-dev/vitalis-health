import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "sage" | "amber" | "alert" | "coral" | "neutral";

const tones: Record<Tone, string> = {
  sage: "bg-sage-light text-sage-dark",
  amber: "bg-amber-light text-amber-dark",
  alert: "bg-alert-light text-alert-dark",
  coral: "bg-coral-light text-coral-dark",
  neutral: "bg-porcelain-2 text-ink-2",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
