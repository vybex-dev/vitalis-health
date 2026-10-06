# Vitalis: AI healthcare copilot you can trust

**ForgeHacks 2026 · Track: AI + Healthcare**
*Prompt: "Build an AI-powered solution that makes healthcare information and interactions clearer, more accessible, or easier to act on."*

> **Try it in 10 seconds:** open the app and click **"Try the demo"**. You land in a populated account for a fictional patient (rising blood pressure, flagged labs, warfarin + ibuprofen). No sign-up. <!-- add your deployed URL here -->

![Architecture](docs/architecture.png)

> Vitalis provides general health information and organizational tools. It is not a medical device, does not diagnose, and is not a substitute for professional medical advice.

---

## The problem

Health information is *technically* available but rarely usable:

- A lab report is a table of numbers and letters. People leave appointments unsure what was said, and many can't read the report's language at all.
- Most people take more than one medicine and have no easy way to know whether two of them clash. Generic chatbots answer from memory, and in medicine a **fluent, confident wrong answer is the worst failure**.
- Appointments are short. People forget the symptom that mattered, or the trend they noticed three weeks ago.
- When someone types "chest pain" into an AI app, the response should never depend on whether a language model happens to behave.

## What Vitalis does differently

Most health-AI projects are a prompt in front of a model. Vitalis puts a **deterministic trust layer around the models**, so every AI output is either *verified by code*, *grounded in a cited source*, or *clearly labelled as unverified*, and the user can see which.

| Healthcare prompt: clearer | How |
| --- | --- |
| **Plain-language report explainer** | Upload or photograph a lab report. Pick one of 9 languages (Hindi, Spanish, Bengali, Tamil, Marathi, French, Portuguese, Arabic, English; RTL supported) and a reading level (simple ≈ 6th grade, or standard). **Read aloud** via the browser's speech synthesis for low-literacy and low-vision users. |
| **Verified lab flags** | The vision model *transcribes* the report; **code re-computes every low/normal/high flag** from the reference range printed on that report. Disagreements are corrected, shown and explained; ranges that can't be parsed are marked "not auto-checked". |

| Healthcare prompt: more accessible | How |
| --- | --- |
| **Works for the moment of need** | Emergency numbers are **region-aware** (911 / 112 / 999 / 000 and national crisis lines) rather than hard-coded to the US. |
| **No account friction** | One-click anonymous demo session. |

| Healthcare prompt: easier to act on | How |
| --- | --- |
| **Visit Prep brief** | Last 30 days on one printable page: current meds, vital trends (fitted slope, out-of-range counts), flagged labs with previous values, repeated symptoms, mood. Copy as text for WhatsApp/email, or print/save as PDF. Data-derived discussion points are **pure rules**; the AI only suggests *questions*. |
| **FDA-grounded medication safety** | Retrieves real FDA drug-label text (openFDA), finds sentences that name the other drug *or its drug class*, and shows the **verbatim excerpt and source**. The model may only summarise excerpts it was given, and recommendations are fixed templates (the model can never say "stop taking X"). Allergy cross-check is rule-based. |

### Why this is "not just a wrapper"

| Layer | What is deterministic and tested | What the model does |
| --- | --- | --- |
| **Emergencies** (`src/lib/safety/redFlags.ts`) | 11 red-flag categories, negation handling, region-aware numbers. Runs **as you type in the browser** and **before** any model call on the server. Symptom-checker urgency is **floored in code** (red flag or severity ≥ 8 ⇒ emergency) and a rule-based emergency result is returned **even if Gemini is down**. | Everything after the notice: supportive follow-up. |
| **Lab values** (`src/lib/labs/referenceRange.ts`) | Parses real-world range formats (`70-99`, `< 5.7`, `≥60`, `4,500-11,000`, decimal commas), refuses sex-specific/categorical ranges, handles `<0.5`-style qualified values only when safe. | Reads text off the image. |
| **Drug interactions** (`src/lib/drugs/*`) | Name/salt/dose normalisation, combo-product splitting, 13 drug classes, word-boundary evidence retrieval, label-language classification (contraindicated / avoid / monitor / mentioned), caching, timeouts. | One-sentence plain-language summary of retrieved excerpts. |
| **Trends & brief** (`src/lib/trends.ts`, `visitBrief.ts`) | Least-squares trend, per-vital stability bands, out-of-range counts, discussion points. | Phrases questions from the facts. |
| **Abuse protection** (`src/lib/api/guard.ts`) | Per-user limits **plus per-IP limits for anonymous demo sessions**, so spinning up fresh anonymous accounts can't burn the AI quota. | n/a |

**Designed failure modes**

- FDA lookup unavailable → result is labelled **"AI only · unverified"**, never shown as verified.
- No label mentions the other drug → *"no mention found, that doesn't guarantee they're safe"*, never *"safe"*.
- Model returns malformed JSON → rejected by zod instead of rendered.
- Model hallucinates a test that wasn't flagged → filtered out server-side.

---

## Evaluation: 54 tests, `npm test`

Pure-logic modules ship with a test suite (`tests/`), including a **safety eval set**: 29 real-world emergency phrasings that must trigger (with the right category) and 16 benign / negated / family-history phrasings that must not. The lab-range parser is tested on its own formats **and on the bundled sample report**: code must reproduce every printed H/L flag on the page. Tests are mutation-checked (breaking word-boundary matching or the allergy logic makes them fail). CI runs typecheck, lint, tests and build.

Writing these tests caught three real bugs before shipping: the emergency detector missed "numbness in my **left** arm" and "bleeding **heavily**", and the lab-range logic wrongly called `<0.5` "normal" against a `0.3–1.0` range (it could equally be low).

```bash
npm run check   # typecheck + lint + tests
npm run build
```

---

## Built during ForgeHacks (Oct 3–10, 2026) vs. pre-existing

Vitalis existed before the hackathon as a health-tracking app with AI chat, a 3D symptom checker and document upload. To comply with the ForgeHacks rules, here is exactly what is **new for this event**:

**New**
- Deterministic emergency red-flag engine, client-side live notice, server pre-LLM triage, urgency floor, model-outage fallback, region-aware emergency numbers (replaced hard-coded 911 in three places)
- Lab-range parser + code verification of AI-extracted flags, with verified/corrected/unverifiable UI
- Plain-language, multilingual, reading-level-aware report explainer with read-aloud
- FDA-label-grounded interaction checker (retrieval, drug classes, evidence UI), rule-based allergy cross-check, labelled fallback
- Visit Prep brief (trends engine, brief assembly, AI questions, print/copy)
- One-click demo mode (anonymous auth, seeded fictional patient, bundled sample lab report), per-IP abuse limits
- 54-test suite, CI workflow, architecture diagram, zod validation on new AI routes

**Pre-existing (not claimed as new):** Next.js app shell and design system, Firebase auth/Firestore data layer, vitals / medications / journal / insights pages, Groq + Gemini chat, 3D symptom checker and body map, document upload + extraction (before verification), landing page.

---

## Features

| Area | What it does |
| --- | --- |
| **AI Copilot** | Quick (Groq Llama 3.3 70B) and Deep (Gemini) modes, streaming, per-user thread history. Live emergency notice as you type. |
| **Symptom Checker** | 3D body map → structured triage with urgency, red flags, self-care tips; urgency enforced by code. |
| **Documents** | Photo/PDF of a lab report or prescription → editable review → saved only after you confirm. Verified flags, explainer, trend charts. |
| **Medication safety** | Dosage/schedule tracking, adherence, FDA-grounded interaction + allergy check. |
| **Visit Prep** | Printable / copyable brief with trends, flagged labs, discussion points, suggested questions. |
| **Vitals · Journal · Insights** | Logging, charts, mood heatmap, weekly AI insights. |
| **Emergency access** | Region-aware one-tap call button on every screen. |

## Tech stack

Next.js 16 (App Router, TypeScript) · React 19 · Tailwind v4 · three.js / react-three-fiber · Framer Motion · Recharts · Firebase Auth + Firestore · **Groq** (Llama 3.3 70B) · **Google Gemini** (default `gemini-3.6-flash`, override with `GEMINI_MODEL`) · **openFDA** drug labels · zod · node:test + tsx.

---

## Run it

```bash
npm install
cp .env.example .env.local   # fill in Firebase + Groq + Gemini keys
npm run dev                  # http://localhost:3000
```

1. **Firebase:** create a project → enable Authentication providers **Email/Password**, **Google** and **Anonymous** (needed for the demo button) → create a Firestore database → paste `firestore.rules` → add a Web app and a service-account key. Copy values into `.env.local` (comments in `.env.example` say where each comes from).
2. **AI keys (free tiers):** Groq at console.groq.com/keys, Gemini at aistudio.google.com/apikey. An openFDA key is optional.
3. **Deploy:** push to GitHub → import in Vercel → add the same env vars → add your Vercel domain under Firebase *Authentication → Settings → Authorized domains*.
4. *Optional housekeeping:* demo sessions create anonymous Firebase users. Enable Firebase's automatic cleanup of anonymous accounts older than 30 days.

### Project structure (new modules)

```
src/lib/safety/       redFlags.ts (detector, urgency floor, regions) · guard.ts (pre-LLM triage)
src/lib/labs/         referenceRange.ts (parse, compare, verify)
src/lib/drugs/        names.ts (normalise, classes, allergies) · openfda.ts (retrieve, evidence, analyse)
src/lib/trends.ts     vitals trend statistics
src/lib/visitBrief.ts brief assembly + text export
src/lib/api/guard.ts  anonymous per-IP rate limiting
src/lib/demo/seed.ts  fictional demo patient
src/app/api/documents/explain, visit-prep/questions   new AI routes (zod-validated)
tests/                54 tests incl. safety eval set
```

---

## Limitations (honest list)

- **Not a medical device, not HIPAA-compliant.** A real deployment would need a BAA, audit logging, and clinical/legal review.
- The red-flag detector is **English-only pattern matching**. It is a safety *floor* beneath the model, not a replacement for clinical judgement, and it will miss unusual phrasings. The explainer can answer in 9 languages, but emergency detection of non-English *input* is future work.
- Lab verification only compares against **the range printed on the report**; it never applies its own clinical ranges, and it won't check categorical (`Negative`) or sex-specific ranges.
- Interaction checking depends on **openFDA label coverage and wording**. Absence of a mention is not evidence of safety, and the UI says so. Drug-class matching is a small curated list.
- Translations are model-generated and should be spot-checked by a native speaker before clinical use.
- The in-memory rate limiter is best-effort per serverless instance; use Redis/Upstash for strict limits.
- Uses the `@google/generative-ai` SDK; Google now recommends `@google/genai` for new work.

## Roadmap

Clinician-reviewed critical-value thresholds, non-English red-flag detection, medication reminders (cron), wearable sync, FHIR import, and a pharmacist-reviewed interaction knowledge base.

## License

Copyright (c) 2026 Harsh Yadav. All Rights Reserved. See [LICENSE](./LICENSE).
