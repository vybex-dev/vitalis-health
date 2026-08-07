"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { subscribeLabResults } from "@/lib/firebase/repo";
import type { LabResult } from "@/types";

export function useLabResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeLabResults(user.uid, (r) => {
      setResults(r);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  return { results, loading };
}
