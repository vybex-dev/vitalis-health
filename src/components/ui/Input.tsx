import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 rounded-xl border border-border-strong bg-white px-3.5 text-sm text-ink placeholder:text-ink-soft/60",
            "outline-none transition-colors focus:border-coral",
            error && "border-alert focus:border-alert",
            className
          )}
          {...props}
        />
        {hint && !error && <span className="text-xs text-ink-soft">{hint}</span>}
        {error && <span className="text-xs text-alert">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";
