"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { subscribeJournal } from "@/lib/firebase/repo";
import type { JournalEntry } from "@/types";

export function useJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeJournal(user.uid, (j) => {
      setEntries(j);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  return { entries, loading };
}
