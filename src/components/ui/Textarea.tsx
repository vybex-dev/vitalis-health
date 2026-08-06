import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const areaId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={areaId} className="text-sm font-medium text-ink-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          className={cn(
            "min-h-24 rounded-xl border border-border-strong bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60",
            "outline-none transition-colors focus:border-coral resize-y",
            error && "border-alert focus:border-alert",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-alert">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

