import { cn } from "@/lib/utils";

export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="15" stroke={dark ? "#f4f7f6" : "#0e2b29"} strokeOpacity="0.15" />
        <path
          d="M4 16H11L13.4 9L18 23L20.6 16H28"
          stroke="#ff6152"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={cn("font-display text-lg font-semibold tracking-tight", dark ? "text-white" : "text-ink")}>
        Vitalis
      </span>
    </span>
  );
}
