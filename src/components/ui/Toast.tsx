"use client";

import { useEffect } from "react";
import { X, CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/utils";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const STYLES = {
  success: "border-sage/30 bg-white text-sage-dark [&_svg.icon]:text-sage",
  error: "border-alert/30 bg-white text-alert-dark [&_svg.icon]:text-alert",
  info: "border-coral/30 bg-white text-ink-2 [&_svg.icon]:text-coral",
  warning: "border-amber/30 bg-white text-amber-dark [&_svg.icon]:text-amber",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-2 sm:right-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={cn(
                "flex min-w-[260px] max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-[var(--shadow-card)]",
                STYLES[t.type]
              )}
              role="alert"
            >
              <Icon className="icon mt-0.5 size-4.5 shrink-0" />
              <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="ml-1 shrink-0 rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
