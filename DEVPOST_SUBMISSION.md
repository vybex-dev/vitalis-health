# Devpost submission kit (copy/paste)

## Title
Vitalis: an AI health copilot you can trust

## Track
AI + Healthcare

## Tagline (one line)
Health AI that is verified by code, grounded in FDA labels, or clearly labelled, in your language.

## Short description (problem + solution)
Lab reports are unreadable, medicine interactions are invisible, and chatbots answer health questions from memory with total confidence. Vitalis turns a lab report into a plain-language explanation in 9 languages, re-checks every flag in code against the report's own printed ranges, checks medication interactions against real FDA label text with the evidence shown, and builds a one-page brief for your next appointment. Emergencies are detected by deterministic rules *before* any model runs.

## Written description

### Problem statement and target users
People are handed health information they can't use. A lab report is a grid of numbers; many patients can't read it in the language it's written in, or at the reading level it assumes. People taking several medicines have no easy way to know whether two clash, and general chatbots answer that from memory, where a fluent wrong answer ("no interactions") is the most dangerous failure. Appointments are short, so the trend someone noticed three weeks ago goes unmentioned. And an AI app that says "chest pain? let me think..." has already failed.

Target users: patients and caregivers managing chronic conditions or several medicines, people with limited health literacy or who prefer a non-English language, and anyone preparing for a short appointment.

### Technical approach
Vitalis puts a **deterministic trust layer around the models** so each AI output is verified by code, grounded in a cited source, or labelled unverified.

- **Emergency safety (rules before models):** an 11-category red-flag detector with negation handling runs live in the browser as you type and again on the server *before* any model call, streaming a region-aware emergency notice first (911/112/999/000, national crisis lines). Symptom-checker urgency is floored in code (red flag or severity ≥ 8 ⇒ emergency) and a rule-based result is returned even if Gemini is down.
- **Verified lab extraction:** Gemini vision transcribes the report; a parser for real-world range formats re-computes every low/normal/high flag from the printed range and marks it verified / corrected / unverifiable. It never applies its own clinical ranges and refuses ambiguous (sex-specific, categorical) ranges.
- **FDA-grounded medication safety:** retrieval from openFDA drug labels, evidence extraction that also understands drug classes (warfarin's label says "NSAIDs", so ibuprofen is found), label-language classification (contraindicated / avoid / monitor), verbatim excerpt + source in the UI. The model only summarises retrieved excerpts, and recommendations are fixed templates so it can never advise stopping a medicine. If retrieval fails, output is labelled "AI only · unverified".
- **Plain-language explainer:** zod-validated multilingual output (9 languages, RTL, 2 reading levels, read-aloud) that explains only values already flagged by code, and server-side filters anything the model adds that wasn't flagged.
- **Visit Prep:** least-squares trends, out-of-range counts, flagged labs with previous values, and rule-derived discussion points computed in code; the model only phrases questions from those facts.
- **Engineering:** Next.js 16, Firebase Auth/Firestore with per-user rules, Groq Llama 3.3 70B + Gemini 3.6 Flash, per-user and per-IP rate limits (so anonymous demo sessions can't drain quota), 54 tests including a safety eval set, CI.

### How it creates real-world impact
Clearer: a patient can understand their report in their own language, at a 6th-grade reading level, and have it read aloud. Easier to act on: they arrive at the appointment with a one-page brief and specific questions, and learn about a risky medicine pairing from a cited FDA source rather than a guess. More accessible: no sign-up needed to try it, emergency guidance works offline of any model and uses the user's local numbers, and the whole app runs on free tiers. Honest limits are built in: the app tells you when it couldn't check something and never equates "not found" with "safe".

### Built during ForgeHacks vs pre-existing
Vitalis existed beforehand as a health-tracking app with AI chat, a 3D symptom checker and basic document upload. Everything in README → "Built during ForgeHacks" is new for this event (trust layer, explainer, FDA grounding, Visit Prep, demo mode, tests, CI).

## Built with
nextjs, react, typescript, tailwindcss, firebase, firestore, google-gemini, groq, llama, openfda, three.js, zod, vercel

## Links to add
- GitHub repo (public): …
- Live demo (use the "Try the demo" button): …
- Demo video (YouTube, public/unlisted, 2–4 min): …

## Screenshots to upload (in this order)
1. Medication safety card with the warfarin + ibuprofen finding open on "Show the label text"
2. Lab report review showing "Flag corrected" / "Checked against range" badges
3. Explainer in Hindi with the Read-aloud button
4. Visit Prep brief
5. Chat with the red emergency notice appearing as you type
6. `docs/architecture.png`

---

# Demo video script (target 3:15, hard limit 4:00)

Record at 1080p with the **demo account** on desktop. Keep the cursor slow. Rehearse once: AI calls take a few seconds.

**0:00 – 0:20 · The problem (talking head or title card)**
"Lab reports are unreadable. Drug interactions are invisible. And health chatbots answer from memory, with total confidence. A wrong 'no interactions' is the most dangerous answer in medicine. Vitalis is built so AI is never trusted blindly."

**0:20 – 0:35 · One click in**
Landing page → click **Try the demo**. "No sign-up. This is a fictional patient on warfarin, lisinopril, metformin and ibuprofen, with blood pressure creeping up."

**0:35 – 1:15 · Lab report → verified → plain language**
Documents → **Try a sample lab report**. When it loads, point at the badges: "The AI read the page. But code re-computed every flag from the range printed on the report. This one says *checked against range*; if the AI had disagreed, it would be corrected and flagged." Scroll to **Explain this report**: choose **Hindi**, **Simple**, click Explain, then **Read aloud**. "Same report, my grandmother's language, a 6th-grade reading level, spoken aloud."

**1:15 – 1:55 · Medication safety**
Medications → **Check interactions**. "It found warfarin plus ibuprofen. But look: it isn't the model's opinion." Open **Show the label text**: "This is the FDA label sentence, with its source. The model only summarised it, and the advice is a fixed template. It can never tell you to stop a medicine." Mention: "If the FDA lookup were down, this badge would turn red: *AI only · unverified*. And 'nothing found' never says 'safe'."

**1:55 – 2:25 · Emergencies never depend on a model**
Chat → type "I have crushing chest pain" **without sending**. The red notice appears instantly. "Detected live, in the browser, before any network call. On the server the same rules run before the model, and the symptom checker enforces urgency in code, even if Gemini is down." Open the Emergency button: "Numbers adapt to your country."

**2:25 – 2:55 · Visit prep**
Visit Prep → type a reason → **Suggest questions**. "Thirty days on one page: BP trending up, LDL flagged high and rising, headaches logged repeatedly. Every number is computed in code; the AI only phrases the questions." Click **Print / save PDF**.

**2:55 – 3:15 · Engineering + impact**
Show `npm test` (54 passing) and the architecture diagram. "11 emergency categories, a lab-range parser, FDA retrieval: all deterministic and tested, including a safety eval set. Vitalis makes health information clearer, more accessible and easier to act on, and it's honest about what it couldn't check."

## Pre-recording checklist
- [ ] Anonymous sign-in enabled in Firebase; demo button works on the deployed URL
- [ ] GROQ_API_KEY, GEMINI_API_KEY set on Vercel; one dry run of each AI feature on the deployed site
- [ ] Hindi explanation looks right on screen (have a Hindi speaker glance at it if possible)
- [ ] Read-aloud works in the browser you record with (voice availability varies by OS/browser)
- [ ] Video is **public or unlisted on YouTube** and ≤ 4:00
- [ ] All team members listed on the Devpost submission; repo is public
