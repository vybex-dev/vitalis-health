// tests/redFlags.test.ts: Tests for red-flag symptom detection.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectRedFlags,
  emergencyNotice,
  maxUrgency,
  regionFromLocale,
  urgencyFloor,
  type RedFlagCategory,
} from "../src/lib/safety/redFlags";

// Each row: [message, expected category]. These are the phrasings real people use.
const MUST_TRIGGER: [string, RedFlagCategory][] = [
  ["I have crushing chest pain that goes down my left arm", "cardiac"],
  ["There's a lot of pressure in my chest and I'm sweating", "cardiac"],
  ["my dad is having a heart attack", "cardiac"],
  ["I can't breathe properly since last night", "respiratory"],
  ["he is gasping for air", "respiratory"],
  ["her lips are turning blue", "respiratory"],
  ["I've been having difficulty breathing and wheezing", "respiratory"],
  ["my face is drooping on one side and my speech is slurred", "stroke"],
  ["sudden numbness in my left arm and trouble speaking", "stroke"],
  ["this is the worst headache of my life", "stroke"],
  ["I'm bleeding heavily and it won't stop", "bleeding"],
  ["I keep vomiting blood", "bleeding"],
  ["he is coughing up blood", "bleeding"],
  ["I think I overdosed on my pills", "overdose"],
  ["my toddler swallowed bleach", "overdose"],
  ["I took too many tablets by mistake", "overdose"],
  ["I'm having an anaphylactic reaction to peanuts", "anaphylaxis"],
  ["my throat is closing after the bee sting", "anaphylaxis"],
  ["I want to kill myself", "mental_health"],
  ["I don't want to be alive anymore", "mental_health"],
  ["I've been thinking about ending my life", "mental_health"],
  ["everyone would be better off dead without me", "mental_health"],
  ["she is having a seizure and it won't stop", "seizure"],
  ["he fell and hit his head, now he's vomiting and confused", "head_injury"],
  ["high fever and she is confused and disoriented", "sepsis"],
  ["grandpa is unresponsive on the floor", "unresponsive"],
  ["he's not breathing", "unresponsive"],
  ["CHEST PAIN!!!", "cardiac"],
  ["I\u2019m having a heart attack", "cardiac"], // curly apostrophe
];

const MUST_NOT_TRIGGER: string[] = [
  "What's a healthy resting heart rate for a 30 year old?",
  "How can I log my blood pressure in the app?",
  "I have a mild headache after a long day at the screen",
  "My knee hurts when I climb stairs",
  "Can you explain what my cholesterol results mean?",
  "I've been feeling a bit tired and low on energy lately",
  "I have a runny nose and a sore throat",
  "I want to start running to improve my breathing capacity",
  "Remind me to take my metformin at 8am",
  "My mother had a heart attack ten years ago; should I get screened?", // family history
  "I have no chest pain, just a scraped elbow",
  "I'm not having any trouble breathing, the cough is mild",
  "denies suicidal thoughts, mood is improving",
  "no fever and no confusion, just a cold",
  "How much water should I drink per day?",
  "What are the side effects of ibuprofen?",
];

test("red flags: every must-trigger phrasing is caught with the right category", () => {
  const missed: string[] = [];
  const wrongCategory: string[] = [];
  for (const [text, category] of MUST_TRIGGER) {
    const r = detectRedFlags(text);
    if (!r.triggered) missed.push(text);
    else if (!r.matches.some((m) => m.category === category)) {
      wrongCategory.push(`${text} -> ${r.matches.map((m) => m.category).join(",")} (wanted ${category})`);
    }
  }
  assert.deepEqual(missed, [], `MISSED emergencies:\n${missed.join("\n")}`);
  assert.deepEqual(wrongCategory, [], `Wrong category:\n${wrongCategory.join("\n")}`);
});

test("red flags: benign and negated messages do not trigger", () => {
  const falsePositives = MUST_NOT_TRIGGER.filter((t) => detectRedFlags(t).triggered);
  assert.deepEqual(falsePositives, [], `False alarms:\n${falsePositives.join("\n")}`);
});

test("red flags: negation does not leak across a clause break", () => {
  // "no fever" must not suppress the chest pain that follows the comma.
  assert.equal(detectRedFlags("no fever, but chest pain since this morning").triggered, true);
});

test("red flags: self-harm intent is flagged as crisis, others are not", () => {
  assert.equal(detectRedFlags("I want to end my life").crisis, true);
  assert.equal(detectRedFlags("crushing chest pain").crisis, false);
});

test("red flags: handles empty / nullish input without throwing", () => {
  assert.equal(detectRedFlags("").triggered, false);
  assert.equal(detectRedFlags(undefined as unknown as string).triggered, false);
});

test("red flags: very long input is bounded and still safe", () => {
  const long = "a".repeat(100_000) + " chest pain";
  assert.doesNotThrow(() => detectRedFlags(long));
});

test("urgency floor: red flag or severity >= 8 forces emergency", () => {
  const none = detectRedFlags("mild sore throat");
  assert.equal(urgencyFloor({ severity: 3, redFlags: none }), "self_care");
  assert.equal(urgencyFloor({ severity: 8, redFlags: none }), "emergency");
  assert.equal(urgencyFloor({ severity: 2, redFlags: detectRedFlags("chest pain") }), "emergency");
});

test("maxUrgency always returns the more cautious level", () => {
  assert.equal(maxUrgency("routine", "prompt"), "prompt");
  assert.equal(maxUrgency("emergency", "self_care"), "emergency");
  assert.equal(maxUrgency("self_care", "self_care"), "self_care");
});

test("emergency notice is region-aware and never tells a crisis user only '911'", () => {
  const india = regionFromLocale("en-IN");
  assert.equal(india.emergency, "112");
  const notice = emergencyNotice(detectRedFlags("I want to kill myself"), india);
  assert.match(notice, /112/);
  assert.match(notice, /14416/);
  assert.match(emergencyNotice(detectRedFlags("chest pain"), regionFromLocale("de-DE")), /112/);
  assert.equal(regionFromLocale(undefined).code, "US"); // safe default
});
