"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { subscribeSymptomChecks, subscribeInsights } from "@/lib/firebase/repo";
import type { SymptomCheck, HealthInsight } from "@/types";

export function useSymptomChecks() {
  const { user } = useAuth();
  const [checks, setChecks] = useState<SymptomCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setChecks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeSymptomChecks(user.uid, (c) => {
      setChecks(c);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  return { checks, loading };
}

export function useInsights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setInsights([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeInsights(user.uid, (i) => {
      setInsights(i);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  return { insights, loading };
}
