"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useVitals } from "@/hooks/useVitals";
import { useMedications } from "@/hooks/useMedications";
import { buildUserContext } from "@/lib/aiContext";
import {
  addChatMessage,
  createChatThread,
  subscribeChatMessages,
  subscribeChatThreads,
  touchChatThread,
} from "@/lib/firebase/repo";
import type { ChatMessage, ChatMode, ChatThread } from "@/types";

export function useChatSession() {
  const { user, profile, getIdToken } = useAuth();
  const { vitals } = useVitals();
  const { medications } = useMedications();

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<ChatMode>("quick");
  const [streamingText, setStreamingText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeChatThreads(user.uid, (t) => {
      setThreads(t);
      setActiveThreadId((current) => current ?? t[0]?.id ?? null);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !activeThreadId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeChatMessages(user.uid, activeThreadId, setMessages);
    return () => unsub();
  }, [user, activeThreadId]);

  const startNewThread = useCallback(() => {
    setActiveThreadId(null);
    setMessages([]);
    setError(null);
  }, []);

  const send = useCallback(
    async (content: string) => {
      if (!user || !content.trim() || sending) return;
      setSending(true);
      setError(null);
      setStreamingText("");

      try {
        let threadId = activeThreadId;
        if (!threadId) {
          threadId = await createChatThread(user.uid, content.slice(0, 60), mode);
          setActiveThreadId(threadId);
        }

        const history = [...messages, { role: "user" as const, content }];
        await addChatMessage(user.uid, threadId, { role: "user", content, mode });
        await touchChatThread(user.uid, threadId, content);

        const token = await getIdToken();
        if (!token) throw new Error("Not signed in.");

        const context = buildUserContext(profile, vitals, medications);
        const endpoint = mode === "deep" ? "/api/chat/deep" : "/api/chat";

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            context,
          }),
        });

        if (!res.ok || !res.body) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(detail?.error || "The copilot couldn't respond right now.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          full += chunk;
          setStreamingText(full);
        }

        await addChatMessage(user.uid, threadId, { role: "assistant", content: full, mode });
        await touchChatThread(user.uid, threadId, full.slice(0, 80));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setStreamingText("");
        setSending(false);
      }
    },
    [user, sending, activeThreadId, mode, messages, profile, vitals, medications, getIdToken]
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return {
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
  };
}
