"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./client";
import type {
  ChatMessage,
  ChatThread,
  HealthInsight,
  JournalEntry,
  Medication,
  SymptomCheck,
  UserProfile,
  VitalReading,
} from "@/types";

const now = () => new Date().toISOString();

// ---------------------------------------------------------------- profile
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function ensureUserProfile(uid: string, email: string, displayName: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const profile: UserProfile = {
      uid,
      email,
      displayName,
      conditions: [],
      allergies: [],
      medications: [],
      onboarded: false,
      createdAt: now(),
      updatedAt: now(),
    };
    await setDoc(ref, profile);
    return profile;
  }
  return snap.data() as UserProfile;
}

export async function updateUserProfile(uid: string, patch: Partial<UserProfile>) {
  await updateDoc(doc(db, "users", uid), { ...patch, updatedAt: now() });
}

export function subscribeUserProfile(uid: string, cb: (p: UserProfile | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    cb(snap.exists() ? (snap.data() as UserProfile) : null);
  });
}

// ----------------------------------------------------------------- vitals
export async function addVital(uid: string, data: Omit<VitalReading, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "users", uid, "vitals"), {
    ...data,
    createdAt: now(),
  });
  return ref.id;
}

export async function deleteVital(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "vitals", id));
}

export function subscribeVitals(uid: string, cb: (v: VitalReading[]) => void, max = 200): Unsubscribe {
  const q = query(collection(db, "users", uid, "vitals"), orderBy("recordedAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as VitalReading)));
  });
}

// ------------------------------------------------------------ medications
export async function addMedication(uid: string, data: Omit<Medication, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "users", uid, "medications"), {
    ...data,
    createdAt: now(),
  });
  return ref.id;
}

export async function updateMedication(uid: string, id: string, patch: Partial<Medication>) {
  await updateDoc(doc(db, "users", uid, "medications", id), patch);
}

export async function deleteMedication(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "medications", id));
}

export function subscribeMedications(uid: string, cb: (m: Medication[]) => void): Unsubscribe {
  const q = query(collection(db, "users", uid, "medications"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Medication)));
  });
}

// ---------------------------------------------------------------- journal
export async function addJournalEntry(uid: string, data: Omit<JournalEntry, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "users", uid, "journal"), {
    ...data,
    createdAt: now(),
  });
  return ref.id;
}

export async function deleteJournalEntry(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "journal", id));
}

export function subscribeJournal(uid: string, cb: (j: JournalEntry[]) => void, max = 90): Unsubscribe {
  const q = query(collection(db, "users", uid, "journal"), orderBy("date", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JournalEntry)));
  });
}

// ---------------------------------------------------------- symptom checks
export async function saveSymptomCheck(uid: string, data: Omit<SymptomCheck, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "users", uid, "symptomChecks"), {
    ...data,
    createdAt: now(),
  });
  return ref.id;
}

export function subscribeSymptomChecks(uid: string, cb: (s: SymptomCheck[]) => void, max = 30): Unsubscribe {
  const q = query(collection(db, "users", uid, "symptomChecks"), orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SymptomCheck)));
  });
}

// ------------------------------------------------------------------ chats
export async function createChatThread(uid: string, title: string, mode: ChatThread["mode"]) {
  const ref = await addDoc(collection(db, "users", uid, "chats"), {
    title,
    mode,
    createdAt: now(),
    updatedAt: now(),
  });
  return ref.id;
}

export async function touchChatThread(uid: string, chatId: string, lastMessage: string) {
  await updateDoc(doc(db, "users", uid, "chats", chatId), {
    lastMessage,
    updatedAt: now(),
  });
}

export function subscribeChatThreads(uid: string, cb: (t: ChatThread[]) => void): Unsubscribe {
  const q = query(collection(db, "users", uid, "chats"), orderBy("updatedAt", "desc"), limit(50));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatThread)));
  });
}

export async function addChatMessage(uid: string, chatId: string, msg: Omit<ChatMessage, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "users", uid, "chats", chatId, "messages"), {
    ...msg,
    createdAt: now(),
  });
  return ref.id;
}

export function subscribeChatMessages(uid: string, chatId: string, cb: (m: ChatMessage[]) => void): Unsubscribe {
  const q = query(collection(db, "users", uid, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
  });
}

// --------------------------------------------------------------- insights
export async function saveInsight(uid: string, data: Omit<HealthInsight, "id" | "generatedAt">) {
  const ref = await addDoc(collection(db, "users", uid, "insights"), {
    ...data,
    generatedAt: now(),
  });
  return ref.id;
}

export function subscribeInsights(uid: string, cb: (i: HealthInsight[]) => void, max = 12): Unsubscribe {
  const q = query(collection(db, "users", uid, "insights"), orderBy("generatedAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HealthInsight)));
  });
}

// One-shot (non-realtime) fetch helpers used by server-triggered AI calls
export async function getRecentVitalsOnce(uid: string, max = 60): Promise<VitalReading[]> {
  const q = query(collection(db, "users", uid, "vitals"), orderBy("recordedAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VitalReading));
}

export async function getRecentJournalOnce(uid: string, max = 30): Promise<JournalEntry[]> {
  const q = query(collection(db, "users", uid, "journal"), orderBy("date", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as JournalEntry));
}

export { serverTimestamp };
