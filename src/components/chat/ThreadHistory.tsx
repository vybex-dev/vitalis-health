"use client";

import { useState } from "react";
import { History, Plus, MessageCircle, Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
  const [search, setSearch] = useState("");

  const filteredThreads = threads.filter(
    (t) =>
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="shrink-0">
        <History className="size-4" /> History
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Conversations">
        <div className="flex flex-col gap-3 mb-4">
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-center"
            onClick={() => {
              onNew();
              setOpen(false);
            }}
          >
            <Plus className="size-4" /> New conversation
          </Button>

          {threads.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-ink-soft" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 rounded-xl border border-border bg-porcelain-2/50 pl-9 pr-3 text-xs text-ink outline-none focus:border-coral"
              />
            </div>
          )}
        </div>

        {filteredThreads.length === 0 ? (
          <p className="text-sm text-ink-soft p-4 text-center">
            {threads.length === 0 ? "No conversations yet." : "No matching conversations found."}
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {filteredThreads.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => {
                    onSelect(t.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-porcelain-2 transition-colors",
                    t.id === activeThreadId && "bg-porcelain-2 font-medium"
                  )}
                >
                  <MessageCircle className="mt-0.5 size-4 shrink-0 text-coral" />
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
