// src/lib/safety/redFlags.ts: Red-flag symptom detection.
// Deterministic emergency red-flag detection.
//
// Why this exists: Vitalis previously relied entirely on the LLM obeying a
// system-prompt list of emergency symptoms. A model can ignore, soften, or
// time out on that instruction. This module runs BEFORE any model call, costs
// nothing, can't hallucinate, and is covered by tests (tests/redFlags.test.ts).
//
// Design choices (documented because they are safety trade-offs):
//  - Bias toward over-triggering. Showing an emergency notice to someone who
//    didn't need it is cheap; missing one who did is not.
//  - Light negation handling ("no chest pain") so the notice isn't absurd,
//    but ONLY for symptom-noun patterns, never for first-person intent
//    statements like "I want to end my life".
//  - Pattern matching is not understanding. It will miss unusual phrasings and
//    non-English text. It is a floor under the model, never a replacement.

export type RedFlagCategory =
  | "cardiac"
  | "respiratory"
  | "stroke"
  | "bleeding"
  | "overdose"
  | "anaphylaxis"
  | "mental_health"
  | "seizure"
  | "head_injury"
  | "sepsis"
  | "unresponsive";

export interface RedFlagMatch {
  category: RedFlagCategory;
  label: string;
  matched: string;
}

export interface RedFlagResult {
  triggered: boolean;
  matches: RedFlagMatch[];
  /** True when any match is a mental-health crisis (changes the wording of the notice). */
  crisis: boolean;
}

interface Pattern {
  category: RedFlagCategory;
  label: string;
  re: RegExp;
  /** Symptom-noun patterns can be negated ("no chest pain"); intent statements cannot. */
  negatable: boolean;
}

const PATTERNS: Pattern[] = [
  // ---- cardiac
  {
    category: "cardiac",
    label: "Chest pain or pressure",
    re: /\bchest\s+(?:pain|pains|pressure|tightness|discomfort)\b|\b(?:pressure|tightness|crushing|squeezing)\s+(?:in|on|across)\s+(?:my\s+|the\s+)?chest\b|\bcrushing\s+chest\b/i,
    negatable: true,
  },
  {
    category: "cardiac",
    label: "Possible heart attack",
    re: /\b(?:having|think\s+i'?m\s+having|might\s+be\s+having|thinks?\s+(?:he|she|they)\s+(?:is|are)\s+having)\s+a\s+heart\s+attack\b/i,
    negatable: false,
  },
  // ---- respiratory
  {
    category: "respiratory",
    label: "Difficulty breathing",
    re: /\b(?:can'?t|cannot|can\s+not|unable\s+to|struggling\s+to|hard\s+to|trouble|difficulty|having\s+difficulty)\s+(?:to\s+)?breath(?:e|ing)\b|\b(?:gasping|fighting)\s+for\s+(?:air|breath)\b|\b(?:severe|sudden|extreme)\s+shortness\s+of\s+breath\b|\blips\s+(?:are\s+|is\s+)?(?:turning\s+|going\s+)?blue\b|\bturning\s+blue\b/i,
    negatable: true,
  },
  // ---- stroke
  {
    category: "stroke",
    label: "Possible stroke signs",
    re: /\bface\s+(?:is\s+)?drooping\b|\bdrooping\s+(?:face|smile)\b|\bfacial\s+droop\b|\bslurred\s+speech\b|\bsudden(?:ly)?\s+(?:weakness|numbness|weak|numb)\s+(?:in|on|of)\s+(?:one|my|the|his|her)\s+(?:(?:left|right)\s+)?(?:arm|leg|side|face|hand)\b|\bsudden\s+(?:confusion|loss\s+of\s+vision|vision\s+loss|trouble\s+(?:speaking|seeing|walking))\b|\bworst\s+headache\s+of\s+my\s+life\b|\bthunderclap\s+headache\b/i,
    negatable: true,
  },
  // ---- bleeding
  {
    category: "bleeding",
    label: "Severe bleeding or vomiting/coughing blood",
    re: /\b(?:severe|heavy|massive|uncontrolled|uncontrollable)\s+bleeding\b|\bbleeding\s+(?:heavily|profusely|a\s+lot|badly)\b|\bbleeding\s+(?:that\s+)?(?:won'?t|will\s+not|doesn'?t|does\s+not|isn'?t|is\s+not)\s+(?:stop|stopping)\b|\b(?:won'?t|will\s+not|can'?t|cannot)\s+stop\s+bleeding\b|\b(?:coughing|vomiting|throwing|spitting)\s+(?:up\s+)?(?:a\s+lot\s+of\s+)?blood\b|\bvomit(?:ing)?\s+blood\b/i,
    negatable: true,
  },
  // ---- overdose / poisoning
  {
    category: "overdose",
    label: "Possible overdose or poisoning",
    re: /\boverdos(?:e|ed|ing)\b|\btook\s+(?:too\s+many|a\s+whole\s+bottle|an\s+entire\s+bottle|a\s+handful\s+of)\b|\bswallowed\s+(?:too\s+many|a\s+bunch\s+of|bleach|poison|antifreeze|detergent)\b|\b(?:been\s+|got\s+|was\s+)poisoned\b|\bingested\s+(?:poison|bleach|antifreeze)\b/i,
    negatable: false,
  },
  // ---- anaphylaxis
  {
    category: "anaphylaxis",
    label: "Possible severe allergic reaction",
    re: /\banaphyla(?:xis|ctic)\b|\bthroat\s+(?:is\s+)?(?:closing|swelling|tightening|getting\s+tight)\b|\b(?:tongue|lips|face)\s+(?:is\s+|are\s+)?swelling\b.{0,60}\b(?:breath|throat)\b|\bhives\b.{0,60}\b(?:trouble|difficulty)\s+breathing\b/i,
    negatable: true,
  },
  // ---- mental health crisis (intent statements are never negation-suppressed)
  {
    category: "mental_health",
    label: "Thoughts of suicide or self-harm",
    re: /\b(?:want|wanting|going|plan(?:ning)?|thinking|thought|think)\s+(?:to|of|about)\s+(?:kill(?:ing)?\s+myself|end(?:ing)?\s+(?:my\s+(?:own\s+)?life|it\s+all)|hurt(?:ing)?\s+myself|harm(?:ing)?\s+myself)\b|\bwant\s+to\s+die\b|\b(?:don'?t|do\s+not)\s+want\s+to\s+(?:live|be\s+alive|be\s+here)\b|\bbetter\s+off\s+dead\b|\bend\s+my\s+life\b|\bkill\s+myself\b|\bsuicid(?:e|al)\b/i,
    negatable: true,
  },
  // ---- seizure
  {
    category: "seizure",
    label: "Seizure",
    re: /\bseizure\b.{0,40}\b(?:won'?t\s+stop|not\s+stopping|longer\s+than\s+5|more\s+than\s+5|for\s+(?:over|more\s+than)\s+(?:five|5))\b|\b(?:is|am|are|keeps?|started)\s+(?:having\s+a\s+seizure|seizing|convulsing)\b|\bhaving\s+a\s+seizure\b/i,
    negatable: true,
  },
  // ---- head injury
  {
    category: "head_injury",
    label: "Head injury with warning signs",
    re: /\b(?:hit|hurt|struck|banged|knocked)\s+(?:my|his|her|their|the)\s+head\b.{0,80}\b(?:unconscious|passed\s+out|blacked\s+out|vomit|vomiting|confus|drows|seizure)\w*|\bhead\s+injury\b.{0,60}\b(?:unconscious|passed\s+out|vomit|confus|drows|seizure)\w*|\bsevere\s+(?:blow|hit|knock)\s+to\s+(?:the|my)\s+head\b/i,
    negatable: true,
  },
  // ---- sepsis
  {
    category: "sepsis",
    label: "Fever with confusion",
    re: /\bfever\b.{0,50}\b(?:confus\w*|disorient\w*|delirious|incoherent)\b|\b(?:confus\w*|disorient\w*|delirious|incoherent)\b.{0,50}\bfever\b/i,
    negatable: true,
  },
  // ---- unresponsive
  {
    category: "unresponsive",
    label: "Unresponsive person or stopped breathing",
    re: /\bunresponsive\b|\b(?:not|isn'?t|won'?t|will\s+not|doesn'?t|does\s+not)\s+(?:responding|respond|waking(?:\s+up)?|wake\s+up)\b|\b(?:stopped|not|isn'?t)\s+breathing\b|\bpassed\s+out\s+and\s+(?:isn'?t|won'?t|not|will\s+not)\b/i,
    negatable: true,
  },
];

const NEGATORS = /\b(?:no|not|without|never|denies|denied|deny|negative\s+for|free\s+of|resolved|nor|absence\s+of)\b|\bdon'?t\s+have\b|\bdo\s+not\s+have\b|\bdoesn'?t\s+have\b|\bhasn'?t\s+had\b|\bhaven'?t\s+had\b|\bhad\s+no\b/i;

/** Looks at the ~28 characters preceding a match for an explicit negator. */
function isNegated(text: string, matchIndex: number): boolean {
  const windowStart = Math.max(0, matchIndex - 28);
  const before = text.slice(windowStart, matchIndex);
  // A clause break (. ; ,  but / however) resets negation: "no fever, chest pain since morning"
  const lastBreak = Math.max(
    before.lastIndexOf("."),
    before.lastIndexOf(";"),
    before.lastIndexOf(","),
    before.search(/\b(?:but|however)\b/i),
  );
  const scoped = lastBreak >= 0 ? before.slice(lastBreak + 1) : before;
  return NEGATORS.test(scoped);
}

export function detectRedFlags(text: string): RedFlagResult {
  const input = (text ?? "").replace(/[\u2018\u2019]/g, "'").slice(0, 4000);
  const matches: RedFlagMatch[] = [];
  const seen = new Set<RedFlagCategory>();

  for (const p of PATTERNS) {
    const re = new RegExp(p.re.source, p.re.flags.includes("g") ? p.re.flags : p.re.flags + "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      if (p.negatable && isNegated(input, m.index)) continue;
      if (!seen.has(p.category)) {
        seen.add(p.category);
        matches.push({ category: p.category, label: p.label, matched: m[0].trim().slice(0, 80) });
      }
      break;
    }
  }

  return {
    triggered: matches.length > 0,
    matches,
    crisis: matches.some((m) => m.category === "mental_health"),
  };
}

// ---------------------------------------------------------------- urgency

export type Urgency = "self_care" | "routine" | "prompt" | "emergency";

const RANK: Record<Urgency, number> = { self_care: 0, routine: 1, prompt: 2, emergency: 3 };

/** Returns the more cautious of two urgency levels. */
export function maxUrgency(a: Urgency, b: Urgency): Urgency {
  return RANK[a] >= RANK[b] ? a : b;
}

/**
 * Enforces, in code, the rules the symptom-checker prompt only *asks* the model
 * to follow: severity >= 8 is an emergency; any red-flag match is an emergency.
 */
export function urgencyFloor(input: { severity: number; redFlags: RedFlagResult }): Urgency {
  if (input.redFlags.triggered) return "emergency";
  if (input.severity >= 8) return "emergency";
  return "self_care";
}

// ------------------------------------------------------ emergency numbers

export interface EmergencyRegion {
  code: string;
  name: string;
  emergency: string;
  /** Mental-health crisis line, where one exists nationally. */
  crisis?: { name: string; number: string };
}

// Numbers are well-known national services. Verify before shipping to a new market.
export const EMERGENCY_REGIONS: EmergencyRegion[] = [
  { code: "US", name: "United States", emergency: "911", crisis: { name: "988 Suicide & Crisis Lifeline", number: "988" } },
  { code: "CA", name: "Canada", emergency: "911", crisis: { name: "988 Suicide Crisis Helpline", number: "988" } },
  { code: "IN", name: "India", emergency: "112", crisis: { name: "Tele-MANAS", number: "14416" } },
  { code: "GB", name: "United Kingdom", emergency: "999", crisis: { name: "Samaritans", number: "116 123" } },
  { code: "AU", name: "Australia", emergency: "000", crisis: { name: "Lifeline", number: "13 11 14" } },
  { code: "EU", name: "European Union", emergency: "112" },
];

export function regionFromLocale(locale: string | undefined | null): EmergencyRegion {
  const region = (locale ?? "").split(/[-_]/)[1]?.toUpperCase();
  const direct = EMERGENCY_REGIONS.find((r) => r.code === region);
  if (direct) return direct;
  const euCountries = ["DE", "FR", "ES", "IT", "NL", "PT", "IE", "BE", "AT", "SE", "FI", "DK", "PL", "GR"];
  if (region && euCountries.includes(region)) return EMERGENCY_REGIONS.find((r) => r.code === "EU")!;
  return EMERGENCY_REGIONS[0];
}

/** The text shown/streamed immediately when a red flag is detected — no model involved. */
export function emergencyNotice(result: RedFlagResult, region: EmergencyRegion = EMERGENCY_REGIONS[0]): string {
  const what = result.matches.map((m) => m.label.toLowerCase()).join("; ");
  if (result.crisis) {
    const line = region.crisis
      ? ` You can also reach ${region.crisis.name} at ${region.crisis.number}.`
      : "";
    return (
      `**You're not alone, and help is available right now.** What you wrote suggests you may be in crisis. ` +
      `If you might act on these thoughts, call your local emergency number (${region.emergency} in ${region.name}) ` +
      `or go to the nearest emergency room.${line} If you can, reach out to someone you trust and stay with them.`
    );
  }
  return (
    `**This may be a medical emergency (${what}).** Call your local emergency number now ` +
    `(${region.emergency} in ${region.name}) or go to the nearest emergency room. ` +
    `Don't wait for an app to answer — Vitalis can't contact anyone for you.`
  );
}
