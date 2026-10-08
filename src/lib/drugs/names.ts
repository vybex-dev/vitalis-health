// src/lib/drugs/names.ts: Drug name normalization and ingredient extraction.
// Drug-name normalisation, therapeutic-class lookup and allergy cross-checks.
// All deterministic and unit-tested (tests/drugs.test.ts).

const FORM_WORDS = new Set([
  "tablet", "tablets", "tab", "tabs", "capsule", "capsules", "cap", "caps", "syrup", "suspension",
  "solution", "injection", "cream", "ointment", "gel", "drops", "inhaler", "patch", "oral", "film",
  "coated", "chewable", "er", "xr", "sr", "cr", "dr", "ec", "xl", "la", "extended", "release",
  "delayed", "immediate", "hard", "soft", "softgel", "softgels", "liquid", "powder", "spray",
]);

// Salt/ester suffixes that don't change which drug it is. Never stripped when they're the first word
// ("sodium bicarbonate" must stay intact).
const SALT_WORDS = new Set([
  "hydrochloride", "hcl", "sodium", "sulfate", "sulphate", "tartrate", "maleate", "besylate",
  "succinate", "mesylate", "acetate", "phosphate", "citrate", "bromide", "hydrobromide", "fumarate",
  "calcium", "magnesium",
]);

/** "Metformin HCl 500 mg tablets" -> "metformin". Combination products return their first ingredient. */
export function normalizeDrugName(raw: string): string {
  return extractIngredients(raw)[0] ?? "";
}

/** Splits combination products ("lisinopril/hydrochlorothiazide") and normalises each ingredient. */
export function extractIngredients(raw: string): string[] {
  const parts = (raw ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // parentheticals e.g. brand names
    .split(/\s*(?:\/|\+|,|;|\band\b|\bwith\b)\s*/)
    .map((p) => cleanOne(p))
    .filter(Boolean);
  return [...new Set(parts)];
}

function cleanOne(part: string): string {
  const tokens = part
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|g|ml|iu|units?|meq|%)(?:\/\s*\d*\s*(?:ml|g|h|hr))?\b/g, " ")
    .replace(/\b\d+(?:[.,]\d+)?\b/g, " ")
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !FORM_WORDS.has(t));
  const kept = tokens.filter((t, i) => i === 0 || !SALT_WORDS.has(t));
  return kept.join(" ").trim();
}

// -------------------------------------------------------------- classes

export interface DrugClass {
  id: string;
  /** Terms FDA labels use when they talk about the class as a whole. */
  labelTerms: string[];
  members: string[];
}

// Deliberately small and conservative: only classes where labels commonly describe interactions at
// class level (so "warfarin + ibuprofen" is found via the warfarin label's "NSAIDs" wording).
export const DRUG_CLASSES: DrugClass[] = [
  {
    id: "NSAIDs",
    labelTerms: ["nsaid", "nsaids", "non-steroidal anti-inflammatory", "nonsteroidal anti-inflammatory"],
    members: ["ibuprofen", "naproxen", "diclofenac", "ketorolac", "celecoxib", "meloxicam", "indomethacin", "etodolac", "aspirin", "nabumetone", "piroxicam"],
  },
  {
    id: "ACE inhibitors",
    labelTerms: ["ace inhibitor", "ace inhibitors", "angiotensin converting enzyme", "angiotensin-converting enzyme"],
    members: ["lisinopril", "enalapril", "ramipril", "captopril", "benazepril", "perindopril", "quinapril", "fosinopril"],
  },
  {
    id: "angiotensin receptor blockers",
    labelTerms: ["angiotensin receptor blocker", "angiotensin receptor blockers", "arb", "arbs", "angiotensin ii receptor"],
    members: ["losartan", "valsartan", "telmisartan", "olmesartan", "irbesartan", "candesartan"],
  },
  {
    id: "anticoagulants",
    labelTerms: ["anticoagulant", "anticoagulants", "blood thinner", "blood thinners"],
    members: ["warfarin", "apixaban", "rivaroxaban", "dabigatran", "edoxaban", "heparin", "enoxaparin"],
  },
  {
    id: "antiplatelets",
    labelTerms: ["antiplatelet", "antiplatelets", "platelet aggregation inhibitor", "platelet inhibitor"],
    members: ["clopidogrel", "prasugrel", "ticagrelor", "aspirin", "dipyridamole"],
  },
  {
    id: "statins",
    labelTerms: ["statin", "statins", "hmg-coa reductase inhibitor"],
    members: ["atorvastatin", "simvastatin", "rosuvastatin", "pravastatin", "lovastatin", "pitavastatin"],
  },
  {
    id: "SSRIs",
    labelTerms: ["ssri", "ssris", "selective serotonin reuptake inhibitor", "selective serotonin reuptake inhibitors"],
    members: ["sertraline", "fluoxetine", "citalopram", "escitalopram", "paroxetine", "fluvoxamine"],
  },
  {
    id: "beta blockers",
    labelTerms: ["beta-blocker", "beta-blockers", "beta blocker", "beta blockers", "beta-adrenergic blocking"],
    members: ["metoprolol", "atenolol", "propranolol", "bisoprolol", "carvedilol", "nebivolol"],
  },
  {
    id: "diuretics",
    labelTerms: ["diuretic", "diuretics", "water pill", "water pills"],
    members: ["furosemide", "hydrochlorothiazide", "chlorthalidone", "spironolactone", "torsemide", "indapamide"],
  },
  {
    id: "sulfonylureas",
    labelTerms: ["sulfonylurea", "sulfonylureas"],
    members: ["glipizide", "glimepiride", "glyburide", "gliclazide"],
  },
  {
    id: "opioids",
    labelTerms: ["opioid", "opioids", "opiate", "opiates", "narcotic"],
    members: ["tramadol", "codeine", "morphine", "oxycodone", "hydrocodone", "fentanyl", "tapentadol"],
  },
  {
    id: "benzodiazepines",
    labelTerms: ["benzodiazepine", "benzodiazepines"],
    members: ["alprazolam", "diazepam", "lorazepam", "clonazepam", "midazolam", "temazepam"],
  },
  {
    id: "potassium-sparing agents / potassium supplements",
    labelTerms: ["potassium-sparing", "potassium supplement", "potassium supplements", "potassium-containing salt substitutes"],
    members: ["spironolactone", "eplerenone", "amiloride", "triamterene", "potassium chloride"],
  },
];

export function classesOf(ingredient: string): DrugClass[] {
  const n = ingredient.toLowerCase();
  return DRUG_CLASSES.filter((c) => c.members.includes(n));
}

// -------------------------------------------------------------- allergies

interface AllergyGroup {
  /** If the user's allergy text contains any of these, the group's members are flagged. */
  triggers: string[];
  members: string[];
  label: string;
}

const ALLERGY_GROUPS: AllergyGroup[] = [
  { label: "penicillins", triggers: ["penicillin", "amoxicillin", "ampicillin"], members: ["penicillin", "amoxicillin", "ampicillin", "piperacillin", "dicloxacillin", "nafcillin", "oxacillin", "clavulanate", "augmentin", "amoxil"] },
  { label: "sulfa antibiotics", triggers: ["sulfa", "sulpha", "sulfonamide", "sulfamethoxazole", "bactrim", "septra"], members: ["sulfamethoxazole", "sulfadiazine", "sulfasalazine", "trimethoprim", "bactrim", "septra", "cotrimoxazole", "co-trimoxazole"] },
  { label: "NSAIDs / aspirin", triggers: ["aspirin", "nsaid", "ibuprofen", "naproxen", "anti-inflammatory"], members: ["aspirin", "ibuprofen", "naproxen", "diclofenac", "ketorolac", "celecoxib", "meloxicam", "indomethacin", "etodolac", "nabumetone", "piroxicam", "advil", "motrin", "aleve"] },
  { label: "cephalosporins", triggers: ["cephalosporin", "cefalexin", "cephalexin", "ceftriaxone"], members: ["cefalexin", "cephalexin", "cefuroxime", "ceftriaxone", "cefixime", "cefdinir", "cefazolin", "cefpodoxime", "cefadroxil"] },
  { label: "opioids", triggers: ["codeine", "opioid", "morphine"], members: ["codeine", "morphine", "oxycodone", "hydrocodone", "tramadol", "fentanyl", "tapentadol"] },
  { label: "macrolides", triggers: ["macrolide", "erythromycin", "azithromycin", "clarithromycin"], members: ["erythromycin", "azithromycin", "clarithromycin"] },
  { label: "fluoroquinolones", triggers: ["fluoroquinolone", "quinolone", "ciprofloxacin", "levofloxacin"], members: ["ciprofloxacin", "levofloxacin", "moxifloxacin", "ofloxacin"] },
];

export interface AllergyAlert {
  medication: string;
  allergy: string;
  kind: "direct" | "same_class";
  note: string;
}

/**
 * Flags a medication whose ingredient is the listed allergen itself ("direct") or belongs to the same
 * drug family ("same_class"). Intentionally does NOT make cross-reactivity claims (e.g. penicillin vs
 * cephalosporin) — those are nuanced clinical calls for a pharmacist.
 */
export function checkAllergies(medicationNames: string[], allergies: string[]): AllergyAlert[] {
  const alerts: AllergyAlert[] = [];
  const seen = new Set<string>();
  const cleanAllergies = allergies.map((a) => a.trim()).filter(Boolean);

  for (const med of medicationNames) {
    const ingredients = extractIngredients(med);
    const haystack = `${med.toLowerCase()} ${ingredients.join(" ")}`;
    for (const allergy of cleanAllergies) {
      const a = allergy.toLowerCase();
      let alert: AllergyAlert | null = null;

      if (ingredients.some((ing) => ing.length >= 4 && a.includes(ing))) {
        alert = {
          medication: med,
          allergy,
          kind: "direct",
          note: `You listed an allergy to "${allergy}", and this medication contains it.`,
        };
      } else {
        for (const g of ALLERGY_GROUPS) {
          if (!g.triggers.some((t) => a.includes(t))) continue;
          if (g.members.some((m) => new RegExp(`\\b${m.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`).test(haystack))) {
            alert = {
              medication: med,
              allergy,
              kind: "same_class",
              note: `You listed an allergy to "${allergy}", and this medication is in the same family (${g.label}).`,
            };
            break;
          }
        }
      }

      if (alert) {
        const key = `${med}|${allergy}`;
        if (!seen.has(key)) {
          seen.add(key);
          alerts.push(alert);
        }
      }
    }
  }
  return alerts;
}
