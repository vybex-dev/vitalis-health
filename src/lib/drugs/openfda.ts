// src/lib/drugs/openfda.ts: OpenFDA drug label lookup and interaction evidence.
import { checkAllergies, classesOf, extractIngredients, type AllergyAlert } from "@/lib/drugs/names";

// Retrieval-grounded interaction checking.
//
// The old implementation asked an LLM "do these drugs interact?" and trusted the
// answer. That fails in the worst possible way: a fluent, confident "no
// interactions" for a pair that does interact. Here, evidence comes from the
// FDA-approved label text (openFDA drug-label API). The model is only allowed to
// SUMMARISE excerpts we retrieved; if no label mentions the other drug, we say
// "no mention found", never "safe".

export interface DrugLabel {
  query: string;
  found: boolean;
  genericNames: string[];
  brandNames: string[];
  interactionsText: string;
  setId?: string;
  effectiveTime?: string;
}

export interface Evidence {
  /** Whose label the excerpt came from. */
  sourceDrug: string;
  source: string;
  excerpt: string;
}

export type LabelLanguage = "contraindicated" | "avoid" | "monitor" | "mentioned";
export type FindingSeverity = "severe" | "moderate" | "unknown";

export interface PairFinding {
  medicationA: string;
  medicationB: string;
  evidence: Evidence[];
  labelLanguage: LabelLanguage;
  severity: FindingSeverity;
}

export interface InteractionAnalysis {
  findings: PairFinding[];
  checkedPairs: number;
  /** Medications for which no label text could be retrieved (so they could only be checked via the other drug's label). */
  unverified: { name: string; reason: "not_found" | "lookup_failed" | "no_interaction_section" }[];
  labels: { name: string; setId?: string; effectiveTime?: string }[];
  lookupFailures: number;
  allergyAlerts: AllergyAlert[];
}

// -------------------------------------------------------------- fetching

const ENDPOINT = "https://api.fda.gov/drug/label.json";
const TTL_FOUND_MS = 24 * 60 * 60 * 1000;
const TTL_MISSING_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; label: DrugLabel }>();

interface OpenFdaResult {
  set_id?: string;
  effective_time?: string;
  drug_interactions?: string[];
  ask_doctor_or_pharmacist?: string[];
  openfda?: { generic_name?: string[]; brand_name?: string[]; substance_name?: string[] };
}

export interface FetchOptions {
  fetchImpl?: typeof fetch;
  apiKey?: string;
  timeoutMs?: number;
  now?: () => number;
}

export class LabelLookupError extends Error {}

export function buildLabelUrl(term: string, apiKey?: string): string {
  const enc = encodeURIComponent(term.replace(/"/g, ""));
  const search = `openfda.generic_name:%22${enc}%22+openfda.brand_name:%22${enc}%22`;
  return `${ENDPOINT}?search=${search}&limit=5${apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : ""}`;
}

export async function fetchDrugLabel(name: string, opts: FetchOptions = {}): Promise<DrugLabel> {
  const ingredient = extractIngredients(name)[0] ?? "";
  const now = opts.now ?? Date.now;
  const empty: DrugLabel = { query: name, found: false, genericNames: [], brandNames: [], interactionsText: "" };
  if (!ingredient) return empty;

  const hit = cache.get(ingredient);
  if (hit && now() - hit.at < (hit.label.found ? TTL_FOUND_MS : TTL_MISSING_MS)) {
    return { ...hit.label, query: name };
  }

  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 6000);
  let res: Response;
  try {
    res = await doFetch(buildLabelUrl(ingredient, opts.apiKey), { signal: controller.signal });
  } catch (err) {
    throw new LabelLookupError(`openFDA request failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 404) {
    // openFDA returns 404 NOT_FOUND when a search has zero matches.
    cache.set(ingredient, { at: now(), label: empty });
    return empty;
  }
  if (!res.ok) throw new LabelLookupError(`openFDA responded ${res.status}`);

  const body = (await res.json()) as { results?: OpenFdaResult[] };
  const label = parseLabelResults(name, body.results ?? []);
  cache.set(ingredient, { at: now(), label });
  return label;
}

/** Picks the label with the most interaction text (prescription labels beat OTC ones for this). */
export function parseLabelResults(query: string, results: OpenFdaResult[]): DrugLabel {
  if (results.length === 0) return { query, found: false, genericNames: [], brandNames: [], interactionsText: "" };

  const textOf = (r: OpenFdaResult) =>
    [...(r.drug_interactions ?? []), ...(r.ask_doctor_or_pharmacist ?? [])].join("\n").replace(/\s+/g, " ").trim();
  const best = [...results].sort((a, b) => textOf(b).length - textOf(a).length)[0];

  const generic = [...new Set([...(best.openfda?.generic_name ?? []), ...(best.openfda?.substance_name ?? [])].map((s) => s.toLowerCase()))];
  const brand = [...new Set((best.openfda?.brand_name ?? []).map((s) => s.toLowerCase()))];
  return {
    query,
    found: true,
    genericNames: generic,
    brandNames: brand,
    interactionsText: textOf(best).slice(0, 60_000),
    setId: best.set_id,
    effectiveTime: best.effective_time,
  };
}

// -------------------------------------------------------------- evidence

const escapeRe = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

/** Every name a label might use for this medication: ingredients, label generic/brand names, and its class terms. */
export function aliasesFor(medName: string, label?: DrugLabel): string[] {
  const ingredients = extractIngredients(medName);
  const classTerms = ingredients.flatMap((i) => classesOf(i).flatMap((c) => c.labelTerms));
  const fromLabel = [...(label?.genericNames ?? []), ...(label?.brandNames ?? [])]
    .flatMap((n) => extractIngredients(n))
    .slice(0, 8);
  return [...new Set([...ingredients, ...fromLabel, ...classTerms])].filter((a) => a.length >= 3);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function classifyLabelLanguage(sentence: string): LabelLanguage {
  if (/\bcontraindicated\b/i.test(sentence)) return "contraindicated";
  if (/\b(?:avoid|should\s+not\s+be\s+(?:used|taken|given|administered|co-?administered)|do\s+not\s+(?:use|take|co-?administer)|not\s+recommended)\b/i.test(sentence)) return "avoid";
  if (/\b(?:monitor|increase[sd]?\s+(?:the\s+)?(?:risk|effect|exposure|levels?|concentrations?)|reduce[sd]?\s+(?:the\s+)?(?:effect|efficacy)|diminish|attenuat|dose\s+(?:adjust|reduc)|enhance[sd]?|potentiat|bleeding|hypotension|hyperkalemia|nephrotoxic|renal\s+function)/i.test(sentence)) return "monitor";
  return "mentioned";
}

const LANGUAGE_RANK: Record<LabelLanguage, number> = { mentioned: 0, monitor: 1, avoid: 2, contraindicated: 3 };

/** Finds sentences in `label`'s interaction text that mention any alias of the other drug. */
export function findMentions(
  label: DrugLabel,
  targetAliases: string[],
  sourceDrug: string,
  maxExcerpts = 2,
): { evidence: Evidence; language: LabelLanguage }[] {
  if (!label.found || !label.interactionsText || targetAliases.length === 0) return [];
  const re = new RegExp(`\\b(?:${targetAliases.map(escapeRe).join("|")})\\b`, "i");
  const sentences = splitSentences(label.interactionsText);
  const out: { evidence: Evidence; language: LabelLanguage }[] = [];
  const used = new Set<number>();

  for (let i = 0; i < sentences.length && out.length < maxExcerpts; i++) {
    if (used.has(i) || !re.test(sentences[i])) continue;
    used.add(i);
    const next = sentences[i + 1];
    const excerpt = [sentences[i], next && !re.test(next) ? next : ""].filter(Boolean).join(" ").slice(0, 480);
    out.push({
      language: classifyLabelLanguage(sentences[i]),
      evidence: {
        sourceDrug,
        source: `FDA drug label for ${sourceDrug}${label.effectiveTime ? ` (effective ${formatFdaDate(label.effectiveTime)})` : ""}${label.setId ? `, set ID ${label.setId}` : ""}`,
        excerpt: excerpt.length >= 480 ? excerpt.replace(/\s+\S*$/, "") + "…" : excerpt,
      },
    });
  }
  return out;
}

function formatFdaDate(yyyymmdd: string): string {
  return /^\d{8}$/.test(yyyymmdd) ? `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6)}` : yyyymmdd;
}

const SEVERITY_FOR: Record<LabelLanguage, FindingSeverity> = {
  contraindicated: "severe",
  avoid: "severe",
  monitor: "moderate",
  mentioned: "unknown",
};

// -------------------------------------------------------------- analysis

export async function analyzeInteractions(
  medications: { name: string }[],
  allergies: string[],
  getLabel: (name: string) => Promise<DrugLabel> = (n) => fetchDrugLabel(n, { apiKey: process.env.OPENFDA_API_KEY }),
): Promise<InteractionAnalysis> {
  // De-duplicate by primary ingredient and cap work per request.
  const seen = new Set<string>();
  const meds = medications
    .filter((m) => {
      const key = extractIngredients(m.name)[0];
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);

  const settled = await Promise.allSettled(meds.map((m) => getLabel(m.name)));
  const labels: (DrugLabel | null)[] = settled.map((s) => (s.status === "fulfilled" ? s.value : null));

  const unverified: InteractionAnalysis["unverified"] = [];
  let lookupFailures = 0;
  meds.forEach((m, i) => {
    const l = labels[i];
    if (l === null) {
      lookupFailures++;
      unverified.push({ name: m.name, reason: "lookup_failed" });
    } else if (!l.found) unverified.push({ name: m.name, reason: "not_found" });
    else if (!l.interactionsText) unverified.push({ name: m.name, reason: "no_interaction_section" });
  });

  const findings: PairFinding[] = [];
  let checkedPairs = 0;
  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      checkedPairs++;
      const A = labels[i];
      const B = labels[j];
      const hits = [
        ...(A ? findMentions(A, aliasesFor(meds[j].name, B ?? undefined), meds[i].name) : []),
        ...(B ? findMentions(B, aliasesFor(meds[i].name, A ?? undefined), meds[j].name) : []),
      ];
      if (hits.length === 0) continue;
      const strongest = hits.reduce<LabelLanguage>(
        (acc, h) => (LANGUAGE_RANK[h.language] > LANGUAGE_RANK[acc] ? h.language : acc),
        "mentioned",
      );
      findings.push({
        medicationA: meds[i].name,
        medicationB: meds[j].name,
        evidence: hits.map((h) => h.evidence).slice(0, 3),
        labelLanguage: strongest,
        severity: SEVERITY_FOR[strongest],
      });
    }
  }
  findings.sort((a, b) => LANGUAGE_RANK[b.labelLanguage] - LANGUAGE_RANK[a.labelLanguage]);

  return {
    findings,
    checkedPairs,
    unverified,
    labels: meds.flatMap((m, i) => (labels[i]?.found ? [{ name: m.name, setId: labels[i]!.setId, effectiveTime: labels[i]!.effectiveTime }] : [])),
    lookupFailures,
    allergyAlerts: checkAllergies(
      medications.map((m) => m.name),
      allergies,
    ),
  };
}

/** Test hook. */
export function _clearLabelCache() {
  cache.clear();
}
