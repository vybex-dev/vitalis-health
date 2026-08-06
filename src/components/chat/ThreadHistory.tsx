"use client";

import { useState } from "react";
import { History, Plus, MessageCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn, formatRelative } from "@/lib/utils";
import type { ChatThread } from "@/types";

export function ThreadHistory({
  threads,
  activeThreadId,
  onSelect,
  onNew,
}: {
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <History className="size-4" /> History
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Conversations">
        <Button
          size="sm"
          variant="outline"
          className="mb-4 w-full justify-center"
          onClick={() => {
            onNew();
            setOpen(false);
          }}
        >
          <Plus className="size-4" /> New conversation
        </Button>

        {threads.length === 0 ? (
          <p className="text-sm text-ink-soft">No conversations yet.</p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => {
                    onSelect(t.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-porcelain-2",
                    t.id === activeThreadId && "bg-porcelain-2"
                  )}
                >
                  <MessageCircle className="mt-0.5 size-4 shrink-0 text-ink-soft" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{t.title || "Conversation"}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      {t.lastMessage || "—"} · {formatRelative(t.updatedAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
