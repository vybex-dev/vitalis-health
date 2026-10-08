// src/lib/demo/seed.ts: Seeds demo data for the demo account.
"use client";

import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  addJournalEntry,
  addLabResult,
  addMedication,
  addVital,
  saveSymptomCheck,
  updateUserProfile,
} from "@/lib/firebase/repo";
import { verifyLabValue } from "@/lib/labs/referenceRange";
import { mulberry32 } from "@/lib/prng";
import { VITAL_META } from "@/types";
import type { VitalType } from "@/types";

// Seeds a FICTIONAL patient so anyone (e.g. a hackathon judge) can see every feature
// without signing up or typing data. Deliberately includes the situations Vitalis is
// built to catch: warfarin + ibuprofen, a rising blood-pressure trend, and flagged labs.

const DAY = 86_400_000;
const daysAgo = (n: number, hour = 8) => {
  const d = new Date(Date.now() - n * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export async function seedDemoData(uid: string): Promise<void> {
  // Idempotent: don't double-seed if the demo session is reused.
  const existing = await getDocs(query(collection(db, "users", uid, "medications"), limit(1)));
  if (!existing.empty) return;

  const rand = mulberry32(20261005);
  const jitter = (amp: number) => (rand() - 0.5) * 2 * amp;

  await updateUserProfile(uid, {
    displayName: "Alex Morgan (demo)",
    dob: "1978-06-14",
    sex: "male",
    heightCm: 176,
    weightKg: 84,
    bloodType: "O+",
    conditions: ["Type 2 diabetes", "Hypertension"],
    allergies: ["Penicillin"],
    emergencyContact: { name: "Sam Morgan", phone: "+1 555 0100", relation: "Spouse" },
    onboarded: true,
  });

  // ---- medications (warfarin + ibuprofen is the classic "should have been caught" pair)
  const med = (m: { name: string; dosage: string; frequency: "once_daily" | "twice_daily" | "as_needed"; times: string[]; color: string; instructions?: string }) =>
    addMedication(uid, { ...m, startDate: daysAgo(120), active: true, lastTakenAt: null });
  await Promise.all([
    med({ name: "Metformin", dosage: "500mg", frequency: "twice_daily", times: ["08:00", "20:00"], color: "#4f9c7d", instructions: "Take with meals" }),
    med({ name: "Lisinopril", dosage: "10mg", frequency: "once_daily", times: ["08:00"], color: "#ff6152" }),
    med({ name: "Warfarin", dosage: "5mg", frequency: "once_daily", times: ["18:00"], color: "#e2a83f", instructions: "Same time each evening" }),
    med({ name: "Ibuprofen", dosage: "400mg", frequency: "as_needed", times: [], color: "#7c8fb8", instructions: "For headaches" }),
  ]);

  // ---- 30 days of vitals: BP drifting up, sleep short, glucose a bit high
  const vitalWrites: Promise<unknown>[] = [];
  const add = (type: VitalType, value: number, ago: number, hour: number, secondary?: number) =>
    vitalWrites.push(
      addVital(uid, {
        type,
        value: Math.round(value * 10) / 10,
        secondaryValue: secondary !== undefined ? Math.round(secondary) : undefined,
        unit: VITAL_META[type].unit,
        recordedAt: daysAgo(ago, hour),
      }),
    );
  for (let ago = 29; ago >= 0; ago -= 2) {
    const t = (29 - ago) / 29; // 0 -> 1 across the month
    add("blood_pressure", 124 + t * 17 + jitter(3), ago, 8, 80 + t * 9 + jitter(2));
    add("heart_rate", 72 + jitter(5), ago, 8);
    add("blood_glucose", 128 + jitter(18), ago, 7);
    add("sleep", 6.4 + jitter(0.8), ago, 7);
    if (ago % 4 === 1) add("weight", 85 - t * 1 + jitter(0.3), ago, 7);
  }
  await Promise.all(vitalWrites);

  // ---- journal: low-ish mood and recurring headaches
  const journal: Promise<unknown>[] = [];
  for (let ago = 13; ago >= 0; ago--) {
    const headache = ago % 3 === 0 || ago % 5 === 0;
    const mood = Math.max(1, Math.min(5, Math.round(3 + jitter(1.2) - (headache ? 0.6 : 0)))) as 1 | 2 | 3 | 4 | 5;
    journal.push(
      addJournalEntry(uid, {
        date: daysAgo(ago).slice(0, 10),
        mood,
        symptoms: headache ? ["Headache", ...(ago % 2 === 0 ? ["Fatigue"] : [])] : ago % 4 === 0 ? ["Fatigue"] : [],
        notes: headache ? "Dull headache in the afternoon." : "",
      }),
    );
  }
  await Promise.all(journal);

  // ---- labs: previous + current draw (flags computed by the same verifier used on uploads)
  const labs: { testName: string; value: string; unit: string; referenceRange: string; ago: number }[] = [
    { testName: "HbA1c", value: "7.1", unit: "%", referenceRange: "4.0-5.6", ago: 95 },
    { testName: "HbA1c", value: "7.6", unit: "%", referenceRange: "4.0-5.6", ago: 8 },
    { testName: "LDL Cholesterol", value: "128", unit: "mg/dL", referenceRange: "< 100", ago: 95 },
    { testName: "LDL Cholesterol", value: "142", unit: "mg/dL", referenceRange: "< 100", ago: 8 },
    { testName: "Fasting Glucose", value: "139", unit: "mg/dL", referenceRange: "70-99", ago: 8 },
    { testName: "Creatinine", value: "0.9", unit: "mg/dL", referenceRange: "0.7-1.3", ago: 8 },
    { testName: "Potassium", value: "4.4", unit: "mmol/L", referenceRange: "3.5-5.1", ago: 8 },
    { testName: "eGFR", value: "88", unit: "mL/min/1.73m2", referenceRange: "> 60", ago: 8 },
  ];
  await Promise.all(
    labs.map((l) => {
      const v = verifyLabValue({ testName: l.testName, value: l.value, unit: l.unit, referenceRange: l.referenceRange, flag: "unknown" });
      return addLabResult(uid, {
        testName: l.testName,
        value: l.value,
        unit: l.unit,
        referenceRange: l.referenceRange,
        flag: v.flag,
        recordedAt: daysAgo(l.ago),
      });
    }),
  );

  await saveSymptomCheck(uid, {
    bodyRegion: "Head",
    symptoms: ["Headache", "Fatigue"],
    severity: 4,
    durationHours: 6,
    freeText: "Dull afternoon headache, third time this week.",
    assessment: {
      urgency: "routine",
      summary: "Recurring afternoon headaches are worth mentioning at a routine visit, especially with your recent blood pressure readings.",
      possibleFactors: ["Can sometimes relate to blood pressure changes", "Can sometimes relate to short sleep or dehydration"],
      redFlags: ["Sudden severe headache", "Headache with confusion, weakness or vision changes"],
      selfCareTips: ["Drink water through the day", "Keep a regular sleep schedule"],
      disclaimer: "This is general information, not a medical diagnosis.",
    },
  });
}
