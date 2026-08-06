"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { subscribeMedications } from "@/lib/firebase/repo";
import type { Medication } from "@/types";

export function useMedications() {
  const { user } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMedications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeMedications(user.uid, (m) => {
      setMedications(m);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  return { medications, loading };
}
