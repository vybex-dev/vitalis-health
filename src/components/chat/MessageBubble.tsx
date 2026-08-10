"use client";

import { useState } from "react";
import { HeartPulse, User, Copy, Check, Clock } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { toast } from "@/store/toastStore";

export function MessageBubble({
  role,
  content,
  createdAt,
  streaming,
}: {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn("group flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-ink text-white" : "bg-coral/15 text-coral"
        )}
      >
        {isUser ? <User className="size-4" /> : <HeartPulse className="size-4" />}
      </div>
      
      <div className="flex flex-col gap-1 max-w-[80%]">
        <div
          className={cn(
            "relative whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser ? "bg-ink text-white" : "border border-border bg-white text-ink-2"
          )}
        >
          {content}
          {streaming && (
            <span className="ml-1 inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-coral animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="size-1.5 rounded-full bg-coral animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="size-1.5 rounded-full bg-coral animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          )}

          {!isUser && !streaming && content && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-porcelain-2 text-ink-soft"
              title="Copy response"
              aria-label="Copy to clipboard"
            >
              {copied ? <Check className="size-3.5 text-sage" /> : <Copy className="size-3.5" />}
            </button>
          )}
        </div>

        {createdAt && (
          <span
            className={cn(
              "text-[10px] text-ink-soft flex items-center gap-1 px-1",
              isUser && "justify-end"
            )}
          >
            <Clock className="size-2.5" />
            {formatTime(createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}
