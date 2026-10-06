// Deterministic verification of AI-extracted lab values.
//
// The extraction model reads the page (vision) and ALSO labels each value
// low/normal/high. Reading text off an image is something models are good at;
// comparing two numbers is something code does perfectly. So we let the model
// transcribe and let code decide the flag, then surface any disagreement to the
// user instead of silently trusting either side.
//
// Hard rule carried over from the prompt: we only ever compare against the
// reference range PRINTED ON THE DOCUMENT. We never apply our own clinical
// ranges, because "normal" depends on the lab, age, sex, and method.

export type LabFlag = "low" | "normal" | "high" | "unknown";

export interface ParsedRange {
  low?: number;
  high?: number;
  lowInclusive: boolean;
  highInclusive: boolean;
}

export interface ParsedValue {
  num: number;
  /** "<" or ">" when the lab reports a bound ("<0.5") rather than an exact number. */
  qualifier?: "<" | ">";
}

/** Handles "1,200" (thousands), "4,5" (decimal comma) and plain "4.5". */
function toNumber(raw: string): number | null {
  let s = raw.trim();
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else if (/^-?\d+,\d{1,2}$/.test(s)) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const NUM = String.raw`-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:[.,]\d+)?`;

export function parseValue(value: string): ParsedValue | null {
  const m = new RegExp(String.raw`^\s*([<>≤≥]=?)?\s*(${NUM})`).exec(value ?? "");
  if (!m) return null;
  const num = toNumber(m[2]);
  if (num === null) return null;
  const q = m[1]?.[0];
  return { num, qualifier: q === "<" || q === "≤" ? "<" : q === ">" || q === "≥" ? ">" : undefined };
}

/**
 * Parses the reference-range strings printed on lab reports. Returns null when
 * the range is categorical ("Negative"), sex/age-specific, or unrecognised —
 * "I can't verify this" is a valid, honest outcome.
 */
export function parseReferenceRange(raw: string | undefined | null): ParsedRange | null {
  if (!raw) return null;
  const text = raw
    .replace(/[\u2013\u2014\u2212]/g, "-") // en/em dash, minus sign
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;

  // Sex- or age-specific ranges ("M: 13-17 F: 12-15") are ambiguous without knowing the patient.
  if (/\b(?:male|female|men|women|adult|child|children|infant|M|F)\s*[:=]/i.test(text)) return null;
  const rangeCount = (text.match(new RegExp(String.raw`(?:${NUM})\s*(?:-|to)\s*(?:${NUM})`, "gi")) ?? []).length;
  if (rangeCount > 1) return null;

  // "70 - 99", "0.4 to 4.0", "4,500-11,000"
  const between = new RegExp(String.raw`(${NUM})\s*(?:-|to)\s*(${NUM})`, "i").exec(text);
  if (between) {
    const low = toNumber(between[1]);
    const high = toNumber(between[2]);
    if (low !== null && high !== null && low <= high) {
      return { low, high, lowInclusive: true, highInclusive: true };
    }
    return null;
  }

  // "< 5.7", "<=200", "≤ 200", "less than 100", "up to 1.2", "below 150", "not more than 200"
  const upper = new RegExp(
    String.raw`(?:^|\s)(?:(<)\s*(=)?|(≤)|(?:less\s+than|up\s+to|below|under|not\s+(?:more|greater)\s+than|maximum|max)\s*(?:or\s+equal\s+to)?)\s*(${NUM})`,
    "i",
  ).exec(text);
  if (upper) {
    const high = toNumber(upper[4]);
    if (high !== null) {
      const inclusive = Boolean(upper[2] || upper[3]) || /up\s+to|not\s+(?:more|greater)|maximum|max|or\s+equal/i.test(upper[0]);
      return { high, lowInclusive: true, highInclusive: inclusive };
    }
  }

  // "> 40", ">=60", "≥ 60", "greater than 60", "above 40", "at least 40", "minimum 40"
  const lower = new RegExp(
    String.raw`(?:^|\s)(?:(>)\s*(=)?|(≥)|(?:greater\s+than|more\s+than|above|over|at\s+least|minimum|min)\s*(?:or\s+equal\s+to)?)\s*(${NUM})`,
    "i",
  ).exec(text);
  if (lower) {
    const low = toNumber(lower[4]);
    if (low !== null) {
      const inclusive = Boolean(lower[2] || lower[3]) || /at\s+least|minimum|min|or\s+equal/i.test(lower[0]);
      return { low, lowInclusive: inclusive, highInclusive: true };
    }
  }

  return null;
}

/** Compares a value against a parsed range. Returns "unknown" when it can't be decided safely. */
export function computeFlag(value: string, range: ParsedRange | null): LabFlag {
  if (!range) return "unknown";
  const v = parseValue(value);
  if (!v) return "unknown";

  const belowLow = (x: number) =>
    range.low !== undefined && (range.lowInclusive ? x < range.low : x <= range.low);
  const aboveHigh = (x: number) =>
    range.high !== undefined && (range.highInclusive ? x > range.high : x >= range.high);

  if (v.qualifier === "<") {
    // The true value is somewhere below v.num. That's only decidable when it
    // pins the value to one side of the range. With a two-sided range, "<0.5"
    // against 0.3-1.0 could be low OR normal, so we must say "unknown".
    if (range.low !== undefined && v.num <= range.low) return "low";
    if (range.low === undefined && range.high !== undefined && v.num <= range.high) return "normal";
    return "unknown";
  }
  if (v.qualifier === ">") {
    if (range.high !== undefined && v.num >= range.high) return "high";
    if (range.high === undefined && range.low !== undefined && v.num >= range.low) return "normal";
    return "unknown";
  }

  if (belowLow(v.num)) return "low";
  if (aboveHigh(v.num)) return "high";
  return "normal";
}

// ------------------------------------------------------------ verification

export type LabVerificationStatus =
  /** Code recomputed the flag from the printed range and it matched the model. */
  | "verified"
  /** Code recomputed a different flag than the model gave; the code's flag was used. */
  | "corrected"
  /** No usable numeric range printed, so the model's flag could not be checked. */
  | "unverifiable";

export interface LabVerification {
  status: LabVerificationStatus;
  /** What the model originally said. */
  modelFlag: LabFlag;
  /** Short, user-facing explanation. */
  note: string;
}

export interface VerifiableLabValue {
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag: LabFlag;
}

const VALID_FLAGS: LabFlag[] = ["low", "normal", "high", "unknown"];

export function verifyLabValue<T extends VerifiableLabValue>(item: T): T & { verification: LabVerification; flag: LabFlag } {
  const modelFlag: LabFlag = VALID_FLAGS.includes(item.flag) ? item.flag : "unknown";
  const range = parseReferenceRange(item.referenceRange);
  const computed = computeFlag(item.value, range);

  if (computed === "unknown") {
    const why = !item.referenceRange
      ? "No reference range was printed, so this flag can't be checked."
      : "Couldn't check this flag automatically (the range isn't a simple number range).";
    return { ...item, flag: modelFlag, verification: { status: "unverifiable", modelFlag, note: why } };
  }

  if (computed === modelFlag) {
    return {
      ...item,
      flag: computed,
      verification: { status: "verified", modelFlag, note: `Checked against the printed range (${item.referenceRange}).` },
    };
  }

  return {
    ...item,
    flag: computed,
    verification: {
      status: "corrected",
      modelFlag,
      note: `The AI first marked this "${modelFlag}", but the printed range (${item.referenceRange}) makes it "${computed}". Please double-check against your original report.`,
    },
  };
}

export interface VerificationSummary {
  total: number;
  verified: number;
  corrected: number;
  unverifiable: number;
}

export function summarizeVerification(items: { verification?: LabVerification }[]): VerificationSummary {
  const s: VerificationSummary = { total: items.length, verified: 0, corrected: 0, unverifiable: 0 };
  for (const i of items) {
    if (i.verification?.status === "verified") s.verified++;
    else if (i.verification?.status === "corrected") s.corrected++;
    else s.unverifiable++;
  }
  return s;
}
