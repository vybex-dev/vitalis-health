"use client";

import { useState, useRef, useEffect } from "react";
import { Send, HeartPulse, Plus } from "lucide-react";
import { useChatSession } from "@/hooks/useChatSession";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ModeToggle } from "@/components/chat/ModeToggle";
import { ThreadHistory } from "@/components/chat/ThreadHistory";
import { Button } from "@/components/ui/Button";

const SUGGESTIONS = [
  "What could cause a dull headache that comes back every afternoon?",
  "Summarize my blood pressure trend from this week.",
  "What should I ask my doctor about my sleep?",
  "Is it normal for my resting heart rate to vary day to day?",
];

export default function ChatPage() {
  const {
    threads,
    activeThreadId,
    setActiveThreadId,
    messages,
    mode,
    setMode,
    streamingText,
    sending,
    error,
    send,
    startNewThread,
    bottomRef,
  } = useChatSession();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  function handleSend(text?: string) {
    const value = (text ?? input).trim();
    if (!value) return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    send(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col md:h-[calc(100vh-4rem)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink sm:text-2xl">AI Copilot</h1>
          <p className="text-xs sm:text-sm text-ink-soft">
            {mode === "quick" ? "Quick mode — instant answers via Groq." : "Deep analysis — thorough reasoning via Gemini."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={startNewThread} className="shrink-0">
            <Plus className="size-4" />
            <span>
              New<span className="hidden sm:inline"> chat</span>
            </span>
          </Button>
          <ModeToggle mode={mode} onChange={setMode} />
          <ThreadHistory
            threads={threads}
            activeThreadId={activeThreadId}
            onSelect={setActiveThreadId}
            onNew={startNewThread}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-white p-4 sm:p-6">
        {messages.length === 0 && !streamingText ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-coral/10 text-coral">
              <HeartPulse className="size-6" />
            </div>
            <div>
              <p className="font-display text-lg font-medium text-ink">What&apos;s on your mind?</p>
              <p className="mt-1 max-w-sm text-sm text-ink-soft">
                Ask about a symptom, a reading, or how to prep for an appointment.
              </p>
            </div>
            <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="rounded-xl border border-border bg-porcelain-2/50 p-3 text-left text-xs text-ink-2 hover:border-coral/40 hover:bg-coral-light/40 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                role={m.role === "assistant" ? "assistant" : "user"}
                content={m.content}
                createdAt={m.createdAt}
              />
            ))}
            {streamingText && <MessageBubble role="assistant" content={streamingText} streaming />}
            {sending && !streamingText && <MessageBubble role="assistant" content="" streaming />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-alert">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="mt-3 flex items-end gap-2"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the copilot anything about your health… (Shift+Enter for newline)"
          className="min-h-[48px] max-h-[120px] resize-none py-3 flex-1 rounded-2xl border border-border-strong bg-white px-4 text-sm text-ink outline-none focus:border-coral"
        />
        <Button type="submit" size="md" loading={sending} disabled={!input.trim()} className="h-12 shrink-0">
          <Send className="size-4" />
        </Button>
      </form>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Vitalis gives general information, not medical advice. For emergencies, use the Emergency button.
      </p>
    </div>
  );
}
