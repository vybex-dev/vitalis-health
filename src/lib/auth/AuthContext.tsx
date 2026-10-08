// src/lib/auth/AuthContext.tsx: Auth context provider and useAuth hook.
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth, googleProvider, firebaseConfigured } from "@/lib/firebase/client";
import { ensureUserProfile, subscribeUserProfile } from "@/lib/firebase/repo";
import { seedDemoData } from "@/lib/demo/seed";
import type { UserProfile } from "@/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  /** True while a demo session is being created and seeded; redirects should wait. */
  demoLoading: boolean;
  configured: boolean;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  /** One-click anonymous session pre-loaded with a fictional patient, for demos and judging. */
  signInAsDemo: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && u.isAnonymous) {
        // Demo sessions create + seed their own profile in signInAsDemo (avoids a race with seeding).
      } else if (u) {
        await ensureUserProfile(u.uid, u.email ?? "", u.displayName ?? "There");
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUserProfile(user.uid, setProfile);
    return () => unsub();
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      demoLoading,
      configured: firebaseConfigured,
      async signUpWithEmail(email, password, name) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(cred.user, { displayName: name });
        await ensureUserProfile(cred.user.uid, email, name || "There");
      },
      async signInWithEmail(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },
      async signInWithGoogle() {
        const cred = await signInWithPopup(auth, googleProvider);
        await ensureUserProfile(cred.user.uid, cred.user.email ?? "", cred.user.displayName ?? "There");
      },
      async signInAsDemo() {
        setDemoLoading(true);
        try {
          const cred = await signInAnonymously(auth);
          await ensureUserProfile(cred.user.uid, "", "Alex Morgan (demo)");
          await seedDemoData(cred.user.uid);
        } finally {
          setDemoLoading(false);
        }
      },
      async signOutUser() {
        await fbSignOut(auth);
      },
      async getIdToken() {
        if (!auth.currentUser) return null;
        return auth.currentUser.getIdToken();
      },
    }),
    [user, profile, loading, demoLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
