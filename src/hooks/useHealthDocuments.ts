"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { subscribeHealthDocuments, subscribeHealthDocument } from "@/lib/firebase/repo";
import type { HealthDocument } from "@/types";

export function useHealthDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<HealthDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeHealthDocuments(user.uid, (d) => {
      setDocuments(d);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  return { documents, loading };
}

export function useHealthDocument(docId: string | null) {
  const { user } = useAuth();
  const [document, setDocument] = useState<HealthDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !docId) {
      setDocument(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeHealthDocument(user.uid, docId, (d) => {
      setDocument(d);
      setLoading(false);
    });
    return () => unsub();
  }, [user, docId]);

  return { document, loading };
}
