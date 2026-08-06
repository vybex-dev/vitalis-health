"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { subscribeVitals } from "@/lib/firebase/repo";
import type { VitalReading } from "@/types";

export function useVitals() {
  const { user } = useAuth();
  const [vitals, setVitals] = useState<VitalReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setVitals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeVitals(user.uid, (v) => {
      setVitals(v);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  return { vitals, loading };
}
