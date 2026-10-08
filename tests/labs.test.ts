// tests/labs.test.ts: Tests for lab reference range parsing and flagging.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFlag,
  parseReferenceRange,
  parseValue,
  summarizeVerification,
  verifyLabValue,
} from "../src/lib/labs/referenceRange";

test("parseReferenceRange: two-sided ranges in common lab formats", () => {
  assert.deepEqual(parseReferenceRange("70-99"), { low: 70, high: 99, lowInclusive: true, highInclusive: true });
  assert.deepEqual(parseReferenceRange("70 - 99 mg/dL"), { low: 70, high: 99, lowInclusive: true, highInclusive: true });
  assert.deepEqual(parseReferenceRange("0.4 to 4.0"), { low: 0.4, high: 4, lowInclusive: true, highInclusive: true });
  assert.deepEqual(parseReferenceRange("13.5\u201317.5"), { low: 13.5, high: 17.5, lowInclusive: true, highInclusive: true }); // en dash
  assert.deepEqual(parseReferenceRange("4,500-11,000"), { low: 4500, high: 11000, lowInclusive: true, highInclusive: true }); // thousands
  assert.deepEqual(parseReferenceRange("0,5-1,2"), { low: 0.5, high: 1.2, lowInclusive: true, highInclusive: true }); // decimal comma
});

test("parseReferenceRange: one-sided ranges", () => {
  assert.deepEqual(parseReferenceRange("< 5.7"), { high: 5.7, lowInclusive: true, highInclusive: false });
  assert.deepEqual(parseReferenceRange("<=200"), { high: 200, lowInclusive: true, highInclusive: true });
  assert.deepEqual(parseReferenceRange("\u2264 200"), { high: 200, lowInclusive: true, highInclusive: true });
  assert.deepEqual(parseReferenceRange("Less than 100"), { high: 100, lowInclusive: true, highInclusive: false });
  assert.deepEqual(parseReferenceRange("Up to 1.2"), { high: 1.2, lowInclusive: true, highInclusive: true });
  assert.deepEqual(parseReferenceRange("> 40"), { low: 40, lowInclusive: false, highInclusive: true });
  assert.deepEqual(parseReferenceRange(">=60"), { low: 60, lowInclusive: true, highInclusive: true });
  assert.deepEqual(parseReferenceRange("Greater than 60"), { low: 60, lowInclusive: false, highInclusive: true });
});

test("parseReferenceRange: refuses to guess on ambiguous or categorical input", () => {
  assert.equal(parseReferenceRange("Negative"), null);
  assert.equal(parseReferenceRange("Non-reactive"), null);
  assert.equal(parseReferenceRange("M: 13-17 F: 12-15"), null); // sex-specific
  assert.equal(parseReferenceRange("Male: 13.5-17.5; Female: 12-15.5"), null);
  assert.equal(parseReferenceRange("10-20 / 30-40"), null); // two ranges
  assert.equal(parseReferenceRange(""), null);
  assert.equal(parseReferenceRange(undefined), null);
  assert.equal(parseReferenceRange("99-70"), null); // inverted, probably an OCR error
});

test("parseValue: numbers, thousands separators and qualifiers", () => {
  assert.deepEqual(parseValue("5.4"), { num: 5.4, qualifier: undefined });
  assert.deepEqual(parseValue("1,200"), { num: 1200, qualifier: undefined });
  assert.deepEqual(parseValue("<0.5"), { num: 0.5, qualifier: "<" });
  assert.deepEqual(parseValue("> 100"), { num: 100, qualifier: ">" });
  assert.deepEqual(parseValue("5.4 H"), { num: 5.4, qualifier: undefined });
  assert.equal(parseValue("Negative"), null);
  assert.equal(parseValue(""), null);
});

test("computeFlag: boundaries are handled per inclusivity", () => {
  const r = parseReferenceRange("70-99");
  assert.equal(computeFlag("70", r), "normal");
  assert.equal(computeFlag("99", r), "normal");
  assert.equal(computeFlag("69.9", r), "low");
  assert.equal(computeFlag("99.1", r), "high");
  const strict = parseReferenceRange("< 5.7");
  assert.equal(computeFlag("5.7", strict), "high"); // exclusive upper bound
  assert.equal(computeFlag("5.6", strict), "normal");
  assert.equal(computeFlag("5.7", parseReferenceRange("<=5.7")), "normal"); // inclusive
});

test("computeFlag: qualified values are only decided when safe", () => {
  assert.equal(computeFlag("<0.5", parseReferenceRange("<5")), "normal"); // below 0.5 is certainly below 5
  assert.equal(computeFlag("<0.5", parseReferenceRange("0.3-1.0")), "unknown"); // could be low or normal
  assert.equal(computeFlag(">200", parseReferenceRange("<100")), "high");
  assert.equal(computeFlag("<0.2", parseReferenceRange("0.3-1.0")), "low");
});

test("computeFlag: non-numeric values and missing ranges are unknown, never guessed", () => {
  assert.equal(computeFlag("Negative", parseReferenceRange("70-99")), "unknown");
  assert.equal(computeFlag("85", null), "unknown");
});

test("verifyLabValue: agrees with a correct model flag", () => {
  const out = verifyLabValue({ testName: "Glucose", value: "92", unit: "mg/dL", referenceRange: "70-99", flag: "normal" });
  assert.equal(out.verification.status, "verified");
  assert.equal(out.flag, "normal");
});

test("verifyLabValue: overrides a wrong model flag and says so", () => {
  const out = verifyLabValue({ testName: "LDL", value: "142", unit: "mg/dL", referenceRange: "< 100", flag: "normal" });
  assert.equal(out.verification.status, "corrected");
  assert.equal(out.flag, "high");
  assert.equal(out.verification.modelFlag, "normal");
  assert.match(out.verification.note, /double-check/i);
});

test("verifyLabValue: no range -> keeps the model flag but marks it unverifiable", () => {
  const out = verifyLabValue({ testName: "Ferritin", value: "30", flag: "low" });
  assert.equal(out.verification.status, "unverifiable");
  assert.equal(out.flag, "low");
});

test("verifyLabValue: garbage model flag is normalised to unknown", () => {
  const out = verifyLabValue({
    testName: "X",
    value: "Positive",
    referenceRange: "Negative",
    flag: "WEIRD" as unknown as "low",
  });
  assert.equal(out.flag, "unknown");
  assert.equal(out.verification.status, "unverifiable");
});

test("summarizeVerification counts each status", () => {
  const items = [
    verifyLabValue({ testName: "a", value: "5", referenceRange: "1-10", flag: "normal" }),
    verifyLabValue({ testName: "b", value: "50", referenceRange: "1-10", flag: "normal" }),
    verifyLabValue({ testName: "c", value: "5", flag: "unknown" }),
  ];
  assert.deepEqual(summarizeVerification(items), { total: 3, verified: 1, corrected: 1, unverifiable: 1 });
});

// The bundled demo report (public/samples/sample-lab-report.png). Printed flags on the page are
// the ground truth: code must reproduce every one of them from the printed ranges alone.
const SAMPLE_REPORT: [string, string, string, "low" | "normal" | "high"][] = [
  ["Fasting Glucose", "139", "70 - 99", "high"],
  ["Hemoglobin A1c", "7.6", "4.0 - 5.6", "high"],
  ["Total Cholesterol", "221", "< 200", "high"],
  ["LDL Cholesterol", "142", "< 100", "high"],
  ["HDL Cholesterol", "38", "> 40", "low"],
  ["Triglycerides", "168", "< 150", "high"],
  ["Creatinine", "0.9", "0.7 - 1.3", "normal"],
  ["eGFR", "88", "> 60", "normal"],
  ["Sodium", "140", "135 - 145", "normal"],
  ["Potassium", "4.4", "3.5 - 5.1", "normal"],
  ["TSH", "2.1", "0.4 - 4.0", "normal"],
  ["Hemoglobin", "14.2", "13.5 - 17.5", "normal"],
  ["White Blood Cells", "6.8", "4.5 - 11.0", "normal"],
  ["Vitamin D, 25-OH", "18", "30 - 100", "low"],
];

test("sample report: code reproduces every printed H/L flag from the printed ranges", () => {
  for (const [testName, value, referenceRange, expected] of SAMPLE_REPORT) {
    const out = verifyLabValue({ testName, value, referenceRange, flag: "unknown" });
    assert.equal(out.flag, expected, `${testName} ${value} vs ${referenceRange}`);
  }
});
