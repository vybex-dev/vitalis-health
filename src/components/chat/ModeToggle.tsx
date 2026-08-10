"use client";

import { Zap, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMode } from "@/types";

export function ModeToggle({ mode, onChange }: { mode: ChatMode; onChange: (m: ChatMode) => void }) {
  return (
    <div className="inline-flex shrink-0 rounded-full border border-border-strong bg-white p-1">
      <button
        onClick={() => onChange("quick")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors",
          mode === "quick" ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
        )}
      >
        <Zap className="size-3.5" /> Quick
      </button>
      <button
        onClick={() => onChange("deep")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors",
          mode === "deep" ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
        )}
      >
        <Brain className="size-3.5" />
        <span>
          Deep<span className="hidden sm:inline"> analysis</span>
        </span>
      </button>
    </div>
  );
}
