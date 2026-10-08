// tests/drugs.test.ts: Tests for drug name normalization and lookup.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { checkAllergies, extractIngredients, normalizeDrugName } from "../src/lib/drugs/names";
import {
  _clearLabelCache,
  analyzeInteractions,
  buildLabelUrl,
  classifyLabelLanguage,
  fetchDrugLabel,
  findMentions,
  parseLabelResults,
  LabelLookupError,
  type DrugLabel,
} from "../src/lib/drugs/openfda";

beforeEach(() => _clearLabelCache());

// ------------------------------------------------------------ names

test("normalizeDrugName: strips doses, forms and salts", () => {
  assert.equal(normalizeDrugName("Metformin HCl 500 mg tablets"), "metformin");
  assert.equal(normalizeDrugName("Atorvastatin 20mg"), "atorvastatin");
  assert.equal(normalizeDrugName("Naproxen Sodium 220 mg"), "naproxen");
  assert.equal(normalizeDrugName("Metoprolol Succinate ER 50mg"), "metoprolol");
  assert.equal(normalizeDrugName("Amoxicillin (Amoxil) 500mg capsule"), "amoxicillin");
  assert.equal(normalizeDrugName("Sodium bicarbonate"), "sodium bicarbonate"); // salt word kept when it's the first token
  assert.equal(normalizeDrugName(""), "");
});

test("extractIngredients: splits combination products", () => {
  assert.deepEqual(extractIngredients("Lisinopril/Hydrochlorothiazide 20/12.5 mg"), ["lisinopril", "hydrochlorothiazide"]);
  assert.deepEqual(extractIngredients("Amoxicillin + Clavulanate"), ["amoxicillin", "clavulanate"]);
});

test("checkAllergies: direct and same-family matches, no false alarms", () => {
  const direct = checkAllergies(["Ibuprofen 400mg"], ["Ibuprofen"]);
  assert.equal(direct.length, 1);
  assert.equal(direct[0].kind, "direct");

  const family = checkAllergies(["Amoxicillin 500mg capsules", "Metformin"], ["Penicillin"]);
  assert.equal(family.length, 1);
  assert.equal(family[0].medication, "Amoxicillin 500mg capsules");
  assert.equal(family[0].kind, "same_class");

  assert.equal(checkAllergies(["Naproxen"], ["NSAIDs"]).length, 1);
  assert.equal(checkAllergies(["Bactrim DS"], ["sulfa drugs"]).length, 1);

  // No false alarms: unrelated allergy / unrelated drug / non-drug allergens.
  assert.equal(checkAllergies(["Metformin", "Lisinopril"], ["Penicillin", "Peanuts", "Latex"]).length, 0);
  assert.equal(checkAllergies([], ["Penicillin"]).length, 0);
  assert.equal(checkAllergies(["Metformin"], []).length, 0);
});

test("checkAllergies: does not assert cross-reactivity (penicillin vs cephalosporin is a pharmacist call)", () => {
  assert.equal(checkAllergies(["Cephalexin"], ["Penicillin"]).length, 0);
});

// ------------------------------------------------------- label language

test("classifyLabelLanguage: strongest wording wins", () => {
  assert.equal(classifyLabelLanguage("Concomitant use is contraindicated."), "contraindicated");
  assert.equal(classifyLabelLanguage("Avoid concomitant use."), "avoid");
  assert.equal(classifyLabelLanguage("Monitor INR closely."), "monitor");
  assert.equal(classifyLabelLanguage("May increase the risk of bleeding."), "monitor");
  assert.equal(classifyLabelLanguage("Studies were conducted with this drug."), "mentioned");
});

// ----------------------------------------------------------- fixtures

function label(name: string, text: string, extra: Partial<DrugLabel> = {}): DrugLabel {
  return {
    query: name,
    found: true,
    genericNames: [name.toLowerCase()],
    brandNames: [],
    interactionsText: text,
    setId: `set-${name}`,
    effectiveTime: "20250115",
    ...extra,
  };
}

const WARFARIN = label(
  "Warfarin",
  "Drugs that increase bleeding risk. Concurrent use of anticoagulants, antiplatelet agents, aspirin and NSAIDs with this drug may increase the risk of bleeding. Monitor patients closely. Other agents can alter INR.",
);
const IBUPROFEN = label(
  "Ibuprofen",
  "ACE inhibitors: NSAIDs may diminish the antihypertensive effect of ACE inhibitors. Aspirin: concomitant use may increase the risk of gastrointestinal adverse events. Anticoagulants such as warfarin: monitor for bleeding.",
);
const LISINOPRIL = label(
  "Lisinopril",
  "Non-steroidal anti-inflammatory drugs (NSAIDs) may reduce the antihypertensive effect of lisinopril. Dual blockade with other renin-angiotensin agents should be avoided.",
);
const METFORMIN = label("Metformin", "Cationic drugs that are eliminated by renal tubular secretion may reduce metformin elimination. Carbonic anhydrase inhibitors may increase the risk of lactic acidosis.");

const byName: Record<string, DrugLabel> = { warfarin: WARFARIN, ibuprofen: IBUPROFEN, lisinopril: LISINOPRIL, metformin: METFORMIN };
const fakeLabels = async (n: string) => {
  const key = normalizeDrugName(n);
  return byName[key] ?? { query: n, found: false, genericNames: [], brandNames: [], interactionsText: "" };
};

test("findMentions: finds the sentence mentioning the other drug by class wording, with provenance", () => {
  const hits = findMentions(WARFARIN, ["ibuprofen", "nsaid", "nsaids"], "Warfarin");
  assert.ok(hits.length >= 1);
  assert.match(hits[0].evidence.excerpt, /NSAIDs/);
  assert.match(hits[0].evidence.source, /FDA drug label for Warfarin/);
  assert.match(hits[0].evidence.source, /2025-01-15/);
  assert.equal(hits[0].language, "monitor");
});

test("findMentions: returns nothing when the label never mentions the drug (no invented evidence)", () => {
  assert.deepEqual(findMentions(METFORMIN, ["warfarin", "anticoagulants"], "Metformin"), []);
  assert.deepEqual(findMentions({ ...METFORMIN, found: false }, ["warfarin"], "Metformin"), []);
  assert.deepEqual(findMentions(METFORMIN, [], "Metformin"), []);
});

test("findMentions: word boundaries prevent partial-word false matches", () => {
  const l = label("X", "This product contains nothing relevant to warfarinoid compounds.");
  assert.deepEqual(findMentions(l, ["warfarin"], "X"), []);
});

test("analyzeInteractions: finds warfarin+ibuprofen and lisinopril+ibuprofen from label text, none for metformin", async () => {
  const meds = [{ name: "Warfarin 5mg" }, { name: "Ibuprofen 400mg" }, { name: "Lisinopril 10mg" }, { name: "Metformin 500mg" }];
  const result = await analyzeInteractions(meds, [], fakeLabels);

  assert.equal(result.checkedPairs, 6);
  assert.equal(result.lookupFailures, 0);
  const pairs = result.findings.map((f) => [f.medicationA, f.medicationB].sort().join(" + "));
  assert.ok(pairs.includes("Ibuprofen 400mg + Warfarin 5mg"), `got ${pairs}`);
  assert.ok(pairs.includes("Ibuprofen 400mg + Lisinopril 10mg"), `got ${pairs}`);
  assert.ok(!pairs.some((p) => p.includes("Metformin")), `metformin should have no findings, got ${pairs}`);

  for (const f of result.findings) {
    assert.ok(f.evidence.length > 0, "every finding must carry evidence");
    assert.ok(f.evidence.every((e) => e.source.startsWith("FDA drug label")));
  }
  assert.equal(result.labels.length, 4);
});

test("analyzeInteractions: reports unverified meds honestly instead of saying 'safe'", async () => {
  const result = await analyzeInteractions([{ name: "Warfarin" }, { name: "SomeUnknownHerb 300mg" }], [], fakeLabels);
  assert.equal(result.findings.length, 0);
  assert.deepEqual(result.unverified, [{ name: "SomeUnknownHerb 300mg", reason: "not_found" }]);
});

test("analyzeInteractions: counts lookup failures so the caller can fall back", async () => {
  const boom = async () => {
    throw new LabelLookupError("network down");
  };
  const result = await analyzeInteractions([{ name: "A" }, { name: "B" }], [], boom);
  assert.equal(result.lookupFailures, 2);
  assert.deepEqual(result.unverified.map((u) => u.reason), ["lookup_failed", "lookup_failed"]);
});

test("analyzeInteractions: de-duplicates repeated medications and caps the workload", async () => {
  let calls = 0;
  const counting = async (n: string) => {
    calls++;
    return fakeLabels(n);
  };
  const dupes = Array.from({ length: 20 }, (_, i) => ({ name: i % 2 ? "Warfarin 5mg" : "Warfarin 2mg" }));
  await analyzeInteractions(dupes, [], counting);
  assert.equal(calls, 1);

  calls = 0;
  const many = Array.from({ length: 30 }, (_, i) => ({ name: `drug${String.fromCharCode(97 + (i % 26))}${"x".repeat(Math.floor(i / 26))}` }));
  await analyzeInteractions(many, [], counting);
  assert.ok(calls <= 8);
});

test("analyzeInteractions: allergy alerts ride along", async () => {
  const result = await analyzeInteractions([{ name: "Amoxicillin 500mg" }, { name: "Metformin" }], ["Penicillin"], fakeLabels);
  assert.equal(result.allergyAlerts.length, 1);
  assert.equal(result.allergyAlerts[0].medication, "Amoxicillin 500mg");
});

// ------------------------------------------------------------ fetching

function fakeFetch(status: number, body: unknown, calls: string[] = []): typeof fetch {
  return (async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
}

test("buildLabelUrl: quotes + encodes the term and appends the optional API key", () => {
  const url = buildLabelUrl('metformin "evil"', "KEY 1");
  assert.match(url, /^https:\/\/api\.fda\.gov\/drug\/label\.json\?search=/);
  assert.match(url, /openfda\.generic_name:%22metformin%20evil%22\+openfda\.brand_name:%22metformin%20evil%22/);
  assert.match(url, /limit=5/);
  assert.match(url, /api_key=KEY%201$/);
  assert.doesNotMatch(buildLabelUrl("x"), /api_key/);
});

test("parseLabelResults: prefers the label with the most interaction text", () => {
  const parsed = parseLabelResults("ibuprofen", [
    { set_id: "otc", ask_doctor_or_pharmacist: ["Ask a doctor first."], openfda: { generic_name: ["IBUPROFEN"] } },
    { set_id: "rx", drug_interactions: ["Long prescription interaction section. ".repeat(20)], openfda: { generic_name: ["IBUPROFEN"], brand_name: ["MOTRIN"] } },
  ]);
  assert.equal(parsed.setId, "rx");
  assert.deepEqual(parsed.brandNames, ["motrin"]);
  assert.equal(parseLabelResults("x", []).found, false);
});

test("fetchDrugLabel: parses a hit, then serves the next call from cache", async () => {
  const calls: string[] = [];
  const f = fakeFetch(200, { results: [{ set_id: "abc", effective_time: "20240101", drug_interactions: ["Warfarin may interact."], openfda: { generic_name: ["METFORMIN"] } }] }, calls);
  const a = await fetchDrugLabel("Metformin 500mg", { fetchImpl: f });
  const b = await fetchDrugLabel("metformin HCl", { fetchImpl: f });
  assert.equal(a.found, true);
  assert.equal(b.found, true);
  assert.equal(calls.length, 1, "second lookup must hit the cache");
});

test("fetchDrugLabel: 404 means 'no such label' (found:false), not an error", async () => {
  const l = await fetchDrugLabel("unobtainium", { fetchImpl: fakeFetch(404, { error: { code: "NOT_FOUND" } }) });
  assert.equal(l.found, false);
});

test("fetchDrugLabel: 429/500/network failures throw so callers can fall back, and are not cached", async () => {
  await assert.rejects(fetchDrugLabel("aspirin", { fetchImpl: fakeFetch(429, {}) }), LabelLookupError);
  await assert.rejects(fetchDrugLabel("aspirin", { fetchImpl: fakeFetch(500, {}) }), LabelLookupError);
  const net = (async () => {
    throw new Error("ECONNRESET");
  }) as unknown as typeof fetch;
  await assert.rejects(fetchDrugLabel("aspirin", { fetchImpl: net }), LabelLookupError);
  // A later success must not be blocked by a poisoned cache.
  const ok = await fetchDrugLabel("aspirin", { fetchImpl: fakeFetch(200, { results: [{ drug_interactions: ["x."] }] }) });
  assert.equal(ok.found, true);
});
