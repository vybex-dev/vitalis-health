import { test } from "node:test";
import assert from "node:assert/strict";
import { linearSlope, summarizeVitals } from "../src/lib/trends";
import { ageFromDob, briefToText, buildVisitBrief, latestFlaggedLabs } from "../src/lib/visitBrief";
import type { LabResult, Medication, UserProfile, VitalReading } from "../src/types";

const NOW = new Date("2026-10-05T12:00:00Z");
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();

function vital(type: VitalReading["type"], value: number, ago: number, secondary?: number): VitalReading {
  return {
    id: `${type}-${ago}`,
    type,
    value,
    secondaryValue: secondary,
    unit: "x",
    recordedAt: daysAgo(ago),
    createdAt: daysAgo(ago),
  };
}

test("linearSlope: exact on a straight line, 0 with no spread", () => {
  assert.equal(linearSlope([0, 1, 2, 3], [10, 12, 14, 16]), 2);
  assert.equal(linearSlope([1, 1, 1], [3, 4, 5]), 0);
  assert.equal(linearSlope([1], [3]), 0);
});

test("summarizeVitals: detects a rising trend and counts out-of-range readings", () => {
  // Systolic BP rising 112 -> 140 over 28 days. Typical range is 90-120.
  const readings = [28, 21, 14, 7, 0].map((ago, i) => vital("blood_pressure", 112 + i * 7, ago, 80));
  const [bp] = summarizeVitals(readings, { now: NOW.getTime() });
  assert.equal(bp.type, "blood_pressure");
  assert.equal(bp.direction, "up");
  assert.equal(bp.latest, 140);
  assert.equal(bp.min, 112);
  assert.equal(bp.max, 140);
  assert.equal(bp.count, 5);
  assert.equal(bp.outOfRange, 3); // 126, 133, 140
  assert.ok((bp.changePct ?? 0) > 15);
});

test("summarizeVitals: flat data is 'stable'; too little data is 'insufficient' (never a fake trend)", () => {
  const flat = [20, 14, 7, 0].map((ago) => vital("heart_rate", 72, ago));
  assert.equal(summarizeVitals(flat, { now: NOW.getTime() })[0].direction, "stable");

  const two = [vital("heart_rate", 60, 10), vital("heart_rate", 90, 0)];
  const t = summarizeVitals(two, { now: NOW.getTime() })[0];
  assert.equal(t.direction, "insufficient");
  assert.equal(t.changePct, null);

  const sameDay = [vital("weight", 70, 0), vital("weight", 75, 0), vital("weight", 80, 0)];
  assert.equal(summarizeVitals(sameDay, { now: NOW.getTime() })[0].direction, "insufficient");
});

test("summarizeVitals: ignores readings outside the window and malformed dates", () => {
  const readings = [vital("weight", 70, 5), vital("weight", 90, 200)];
  readings.push({ ...vital("weight", 1, 1), recordedAt: "not-a-date" });
  const [w] = summarizeVitals(readings, { now: NOW.getTime(), days: 30 });
  assert.equal(w.count, 1);
  assert.equal(w.latest, 70);
});

test("summarizeVitals: types with no typical range report outOfRange = 0", () => {
  const [steps] = summarizeVitals([vital("steps", 100, 3), vital("steps", 90000, 1)], { now: NOW.getTime() });
  assert.equal(steps.hasRange, false);
  assert.equal(steps.outOfRange, 0);
});

function lab(testName: string, value: string, flag: LabResult["flag"], ago: number): LabResult {
  return { id: `${testName}${ago}`, testName, value, flag, unit: "mg/dL", referenceRange: "<100", recordedAt: daysAgo(ago), createdAt: daysAgo(ago) };
}

test("latestFlaggedLabs: uses the most recent result per test and includes the previous value", () => {
  const out = latestFlaggedLabs([
    lab("LDL", "160", "high", 90),
    lab("LDL", "142", "high", 5),
    lab("A1c", "7.4", "high", 90),
    lab("A1c", "6.4", "normal", 5), // improved: no longer flagged
    lab("ldl ", "150", "high", 40), // same test, different casing/spacing
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].testName, "LDL");
  assert.equal(out[0].value, "142");
  assert.equal(out[0].previousValue, "150");
});

test("ageFromDob: handles birthdays not yet reached and bad input", () => {
  assert.equal(ageFromDob("2000-10-06", NOW), 25); // birthday tomorrow
  assert.equal(ageFromDob("2000-10-05", NOW), 26);
  assert.equal(ageFromDob("garbage", NOW), undefined);
  assert.equal(ageFromDob(null, NOW), undefined);
  assert.equal(ageFromDob("2999-01-01", NOW), undefined); // future DOB
});

const profile: UserProfile = {
  uid: "u1",
  email: "a@b.c",
  displayName: "Asha",
  dob: "1980-03-02",
  sex: "female",
  conditions: ["Hypertension"],
  allergies: ["Penicillin"],
  medications: [],
  emergencyContact: { name: "Ravi", phone: "+91 90000 00000", relation: "Brother" },
  onboarded: true,
  createdAt: daysAgo(100),
  updatedAt: daysAgo(1),
};

const meds: Medication[] = [
  { id: "1", name: "Lisinopril", dosage: "10mg", frequency: "once_daily", times: ["08:00"], startDate: daysAgo(60), active: true, color: "#fff", createdAt: daysAgo(60) },
  { id: "2", name: "OldDrug", dosage: "5mg", frequency: "twice_daily", times: [], startDate: daysAgo(90), active: false, color: "#fff", createdAt: daysAgo(90) },
];

test("buildVisitBrief: assembles facts, drops inactive meds, and derives discussion points deterministically", () => {
  const brief = buildVisitBrief(
    {
      profile,
      vitals: [28, 21, 14, 7, 0].map((ago, i) => vital("blood_pressure", 112 + i * 7, ago, 80)),
      medications: meds,
      labResults: [lab("LDL", "142", "high", 5)],
      symptomChecks: [],
      journal: [
        { id: "j1", date: daysAgo(2).slice(0, 10), mood: 2, symptoms: ["Headache"], notes: "", createdAt: daysAgo(2) },
        { id: "j2", date: daysAgo(3).slice(0, 10), mood: 2, symptoms: ["headache"], notes: "", createdAt: daysAgo(3) },
        { id: "j3", date: daysAgo(4).slice(0, 10), mood: 3, symptoms: ["HEADACHE"], notes: "", createdAt: daysAgo(4) },
      ],
      reasonForVisit: "  BP follow-up ",
    },
    NOW,
  );

  assert.equal(brief.patient.age, 46);
  assert.equal(brief.reasonForVisit, "BP follow-up");
  assert.deepEqual(brief.medications.map((m) => m.name), ["Lisinopril"]);
  assert.equal(brief.medications[0].frequency, "once daily");
  assert.equal(brief.flaggedLabs[0].testName, "LDL");
  assert.equal(brief.mood?.topSymptoms[0].symptom, "headache");
  assert.equal(brief.mood?.topSymptoms[0].count, 3);

  const text = brief.discussionPoints.join(" | ");
  assert.match(text, /Blood pressure has trended up/);
  assert.match(text, /LDL was flagged high/);
  assert.match(text, /"headache" was logged 3 times/);
  assert.match(text, /Average mood.*low/);
});

test("buildVisitBrief: works with a brand-new empty account (no crashes, honest empties)", () => {
  const brief = buildVisitBrief(
    { profile: null, vitals: [], medications: [], labResults: [], symptomChecks: [], journal: [] },
    NOW,
  );
  assert.equal(brief.patient.name, "Patient");
  assert.equal(brief.vitals.length, 0);
  assert.equal(brief.mood, null);
  assert.deepEqual(brief.discussionPoints, []);
  const text = briefToText(brief);
  assert.match(text, /no readings logged/);
  assert.match(text, /none flagged/);
});

test("briefToText: includes questions and the self-reported disclaimer", () => {
  const brief = buildVisitBrief(
    { profile, vitals: [], medications: meds, labResults: [], symptomChecks: [], journal: [] },
    NOW,
  );
  const text = briefToText(brief, ["Should my dose change?"]);
  assert.match(text, /self-reported data, not a medical record/);
  assert.match(text, /1\. Should my dose change\?/);
  assert.match(text, /Lisinopril 10mg, once daily/);
  assert.doesNotMatch(text, /OldDrug/);
});
