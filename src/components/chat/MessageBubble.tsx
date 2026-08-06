import { HeartPulse, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-ink text-white" : "bg-coral/15 text-coral"
        )}
      >
        {isUser ? <User className="size-4" /> : <HeartPulse className="size-4" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser ? "bg-ink text-white" : "border border-border bg-white text-ink-2"
        )}
      >
        {content}
        {streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse-slow bg-coral align-middle" />}
      </div>
    </div>
  );
}
