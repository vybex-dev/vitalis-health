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
  HealthDocument,
  HealthInsight,
  JournalEntry,
  LabResult,
  Medication,
  SymptomCheck,
  UserProfile,
  VitalReading,
} from "@/types";

const now = () => new Date().toISOString();

/** Firestore rejects `undefined` field values outright. AI-extracted and
 * optional-form data frequently omits fields rather than nulling them, so
 * every write path funnels through this before hitting addDoc/updateDoc/setDoc. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

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
  await updateDoc(doc(db, "users", uid), stripUndefined({ ...patch, updatedAt: now() }));
}

export function subscribeUserProfile(uid: string, cb: (p: UserProfile | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    cb(snap.exists() ? (snap.data() as UserProfile) : null);
  });
}

// ----------------------------------------------------------------- vitals
export async function addVital(uid: string, data: Omit<VitalReading, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "users", uid, "vitals"), stripUndefined({
    ...data,
    createdAt: now(),
  }));
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
  const ref = await addDoc(collection(db, "users", uid, "medications"), stripUndefined({
    ...data,
    createdAt: now(),
  }));
  return ref.id;
}

export async function updateMedication(uid: string, id: string, patch: Partial<Medication>) {
  await updateDoc(doc(db, "users", uid, "medications", id), stripUndefined(patch));
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
  const ref = await addDoc(collection(db, "users", uid, "journal"), stripUndefined({
    ...data,
    createdAt: now(),
  }));
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
  const ref = await addDoc(collection(db, "users", uid, "symptomChecks"), stripUndefined({
    ...data,
    createdAt: now(),
  }));
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
  const ref = await addDoc(collection(db, "users", uid, "chats"), stripUndefined({
    title,
    mode,
    createdAt: now(),
    updatedAt: now(),
  }));
  return ref.id;
}

export async function touchChatThread(uid: string, chatId: string, lastMessage: string) {
  await updateDoc(doc(db, "users", uid, "chats", chatId), stripUndefined({
    lastMessage,
    updatedAt: now(),
  }));
}

export function subscribeChatThreads(uid: string, cb: (t: ChatThread[]) => void): Unsubscribe {
  const q = query(collection(db, "users", uid, "chats"), orderBy("updatedAt", "desc"), limit(50));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatThread)));
  });
}

export async function addChatMessage(uid: string, chatId: string, msg: Omit<ChatMessage, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "users", uid, "chats", chatId, "messages"), stripUndefined({
    ...msg,
    createdAt: now(),
  }));
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
  const ref = await addDoc(collection(db, "users", uid, "insights"), stripUndefined({
    ...data,
    generatedAt: now(),
  }));
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

// --------------------------------------------------------------- documents
/** Creates the Firestore document with the file stored inline as base64 (status: "processing"). */
export async function createHealthDocument(
  uid: string,
  data: { fileName: string; fileBase64: string; mimeType: string; sizeBytes: number }
): Promise<string> {
  const docRef = await addDoc(collection(db, "users", uid, "documents"), stripUndefined({
    fileName: data.fileName,
    fileBase64: data.fileBase64,
    mimeType: data.mimeType,
    sizeBytes: data.sizeBytes,
    status: "processing",
    extraction: null,
    error: null,
    uploadedAt: now(),
  }));
  return docRef.id;
}

export async function updateHealthDocument(uid: string, docId: string, patch: Partial<HealthDocument>) {
  await updateDoc(doc(db, "users", uid, "documents", docId), stripUndefined(patch));
}

export async function deleteHealthDocument(uid: string, docId: string) {
  await deleteDoc(doc(db, "users", uid, "documents", docId));
}

export function subscribeHealthDocuments(uid: string, cb: (d: HealthDocument[]) => void, max = 50): Unsubscribe {
  const q = query(collection(db, "users", uid, "documents"), orderBy("uploadedAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HealthDocument)));
  });
}

export function subscribeHealthDocument(uid: string, docId: string, cb: (d: HealthDocument | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "users", uid, "documents", docId), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as HealthDocument) : null);
  });
}

// -------------------------------------------------------------- lab results
export async function addLabResult(uid: string, data: Omit<LabResult, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "users", uid, "labResults"), stripUndefined({
    ...data,
    createdAt: now(),
  }));
  return ref.id;
}

export async function deleteLabResult(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "labResults", id));
}

export function subscribeLabResults(uid: string, cb: (r: LabResult[]) => void, max = 200): Unsubscribe {
  const q = query(collection(db, "users", uid, "labResults"), orderBy("recordedAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LabResult)));
  });
}

export { serverTimestamp };
