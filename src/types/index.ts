// Shared domain types for Vitalis. Firestore documents are typed loosely
// (timestamps arrive as Firestore Timestamp on the server and are normalized
// to ISO strings on the client — see lib/firebase/converters.ts).

export type Sex = "female" | "male" | "intersex" | "prefer_not_to_say";

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  dob?: string | null;
  sex?: Sex | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bloodType?: string | null;
  conditions: string[];
  allergies: string[];
  medications: string[];
  emergencyContact?: EmergencyContact | null;
  onboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export type VitalType =
  | "blood_pressure"
  | "heart_rate"
  | "weight"
  | "blood_glucose"
  | "spo2"
  | "sleep"
  | "steps"
  | "temperature"
  | "mood";

export interface VitalReading {
  id: string;
  type: VitalType;
  value: number; // primary numeric value (e.g. systolic for BP, bpm for HR)
  secondaryValue?: number | null; // diastolic for BP
  unit: string;
  note?: string;
  recordedAt: string; // ISO datetime chosen by the user
  createdAt: string;
}

export const VITAL_META: Record<
  VitalType,
  { label: string; unit: string; icon: string; healthyRange?: [number, number]; secondaryLabel?: string }
> = {
  blood_pressure: { label: "Blood pressure", unit: "mmHg", icon: "activity", healthyRange: [90, 120], secondaryLabel: "diastolic" },
  heart_rate: { label: "Heart rate", unit: "bpm", icon: "heart-pulse", healthyRange: [60, 100] },
  weight: { label: "Weight", unit: "kg", icon: "scale" },
  blood_glucose: { label: "Blood glucose", unit: "mg/dL", icon: "droplet", healthyRange: [70, 140] },
  spo2: { label: "Blood oxygen", unit: "%", icon: "wind", healthyRange: [95, 100] },
  sleep: { label: "Sleep", unit: "hrs", icon: "moon", healthyRange: [7, 9] },
  steps: { label: "Steps", unit: "steps", icon: "footprints" },
  temperature: { label: "Temperature", unit: "°C", icon: "thermometer", healthyRange: [36.1, 37.2] },
  mood: { label: "Mood", unit: "/5", icon: "smile" },
};

export type MedicationFrequency = "once_daily" | "twice_daily" | "three_times_daily" | "as_needed" | "weekly" | "custom";

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  times: string[]; // "08:00", "20:00" ...
  instructions?: string;
  startDate: string;
  endDate?: string | null;
  active: boolean;
  color: string;
  lastTakenAt?: string | null;
  sourceDocumentId?: string | null;
  createdAt: string;
}

export interface MedicationLogEntry {
  id: string;
  medicationId: string;
  scheduledFor: string;
  takenAt: string | null;
  status: "taken" | "skipped" | "pending";
}

export interface JournalEntry {
  id: string;
  date: string; // yyyy-MM-dd
  mood: 1 | 2 | 3 | 4 | 5;
  symptoms: string[];
  notes: string;
  createdAt: string;
}

export type ChatMode = "quick" | "deep";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  mode?: ChatMode;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  title: string;
  mode: ChatMode;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

export type UrgencyLevel = "self_care" | "routine" | "prompt" | "emergency";

export const URGENCY_META: Record<UrgencyLevel, { label: string; description: string; color: string }> = {
  self_care: { label: "Self-care", description: "Likely manageable at home with monitoring.", color: "sage" },
  routine: { label: "Routine care", description: "Worth a non-urgent visit to a clinician.", color: "amber" },
  prompt: { label: "Prompt care", description: "See a clinician within 24 hours.", color: "amber" },
  emergency: { label: "Emergency", description: "Seek emergency care immediately.", color: "alert" },
};

export interface SymptomCheck {
  id: string;
  bodyRegion: string;
  symptoms: string[];
  severity: number; // 1-10
  durationHours: number;
  freeText?: string;
  assessment: {
    urgency: UrgencyLevel;
    summary: string;
    possibleFactors: string[];
    redFlags: string[];
    selfCareTips: string[];
    disclaimer: string;
  };
  createdAt: string;
}

export interface HealthInsight {
  id: string;
  period: "weekly" | "monthly";
  rangeStart: string;
  rangeEnd: string;
  summary: string;
  highlights: string[];
  watchOuts: string[];
  suggestions: string[];
  generatedAt: string;
}

export interface HealthScore {
  score: number; // 0-100
  label: "great" | "good" | "fair" | "needs_attention";
  factors: string[];
}

// ------------------------------------------------------- uploaded documents
export type DocumentType = "lab_report" | "prescription" | "other";
export type DocumentStatus = "processing" | "pending_review" | "reviewed" | "discarded" | "failed";

export interface ExtractedLabValue {
  testName: string;
  value: string; // kept as string — lab values aren't always numeric (e.g. "Negative")
  unit?: string;
  referenceRange?: string;
  flag: "low" | "normal" | "high" | "unknown";
}

export interface ExtractedMedication {
  medicationName: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
}

export interface DocumentExtraction {
  documentType: DocumentType;
  summary: string;
  labValues: ExtractedLabValue[];
  medications: ExtractedMedication[];
  lowConfidenceWarning: boolean;
  disclaimer: string;
}

export interface HealthDocument {
  id: string;
  fileName: string;
  fileBase64: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  extraction?: DocumentExtraction | null;
  error?: string | null;
  uploadedAt: string;
  reviewedAt?: string | null;
}

export interface LabResult {
  id: string;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag: "low" | "normal" | "high" | "unknown";
  recordedAt: string;
  sourceDocumentId?: string | null;
  createdAt: string;
}
