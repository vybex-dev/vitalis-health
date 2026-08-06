# Vitalis — AI Personal Healthcare Copilot

Vitalis is a full-stack personal health tracking app: log vitals, medications,
symptoms, and journal entries, then get plain-language guidance from an AI
copilot — fast answers via **Groq (Llama 3.3 70B)**, or a more thorough
**Deep analysis** mode via **Gemini 2.5 Flash**. It ships with an interactive
3D symptom checker (Three.js), realtime charts, and a from-scratch design
system — not a template.

> **Vitalis provides general health information and organizational tools. It
> is not a medical device, does not diagnose conditions, and is not a
> substitute for professional medical advice, diagnosis, or treatment.**
> See [Safety & disclaimers](#safety--disclaimers) below.

---

## Features

| Area | What it does |
|---|---|
| **AI Copilot** | Two-speed chat: instant answers via Groq, or "Deep analysis" via Gemini 2.5 Flash. Threaded conversation history stored per user. Streams token-by-token. |
| **Symptom Checker** | Interactive 3D body map (raycasting on a procedural Three.js humanoid) → structured triage via Gemini, returning an urgency level, possible factors, red flags, and self-care tips — always non-diagnostic. |
| **Vitals** | Log blood pressure, heart rate, weight, glucose, SpO₂, sleep, steps, temperature. Realtime line charts (Recharts) per type. |
| **Medications** | Dosage, frequency, schedule, one-tap "mark as taken," archive/restore. |
| **Journal** | Daily mood + symptom + note logging, with an AI-generated reflection/summary. |
| **Insights** | On-demand AI weekly summaries synthesized from logged vitals + journal data. |
| **Emergency access** | Persistent emergency button (tel: links to 911 and the user's saved emergency contact) available on every authenticated screen. |
| **3D & motion** | A heartbeat-synced "Pulse Orb" hero (Three.js + react-three-fiber), a dashboard "Health Orb," and Framer Motion throughout. |

## Tech stack

- **Framework:** Next.js 16 (App Router, TypeScript), deployed as a single Vercel project (frontend + serverless API routes)
- **3D / animation:** three.js, @react-three/fiber, @react-three/drei, Framer Motion
- **Styling:** Tailwind CSS v4 (CSS-based theme, no config file needed), self-hosted fonts via `@fontsource` (no external font requests at build or runtime)
- **Auth & database:** Firebase Authentication (email/password + Google) and Firestore (client SDK for reads/writes, Admin SDK only for verifying ID tokens on API routes)
- **AI:** `groq-sdk` (Llama 3.3 70B, streaming) and `@google/generative-ai` (Gemini 2.5 Flash, streaming + structured JSON output)
- **Charts:** Recharts

### Why this architecture

Firestore reads/writes happen straight from the browser using the Firebase
client SDK, secured by the security rules in `firestore.rules` (every
document lives under `/users/{uid}/...` and only that user can touch it).
The **only** thing that needs a server round-trip is anything requiring a
secret API key — Groq and Gemini calls — so those live in Next.js API routes
under `src/app/api/*`, each of which verifies the caller's Firebase ID token
with the Admin SDK before doing anything. This keeps the backend surface
small, keeps API keys off the client, and still deploys as one Vercel
project with zero extra infrastructure.

---

## Project structure

```
src/
  app/
    page.tsx                 Marketing landing page
    (auth)/login, signup     Auth pages
    onboarding/               Post-signup profile wizard
    (app)/                    Authenticated app shell (sidebar + guards)
      dashboard, chat, vitals, medications,
      symptom-checker, journal, insights, profile
    api/
      chat/route.ts           Groq streaming chat ("Quick" mode)
      chat/deep/route.ts      Gemini streaming chat ("Deep analysis" mode)
      symptom-check/route.ts  Gemini structured JSON triage
      insights/weekly/route.ts  Gemini structured JSON weekly insight
      journal/summary/route.ts  Gemini structured JSON journal reflection
  components/
    three/                   PulseOrb, HealthOrb, BodyMap, ParticleField, PulseLine
    ui/                      Button, Card, Input, Modal, Badge, etc.
    layout/, landing/, chat/, vitals/, medications/, journal/, symptom/, dashboard/, auth/
  lib/
    firebase/client.ts        Firebase client SDK init
    firebase/admin.ts         Firebase Admin SDK init + ID token verification
    firebase/repo.ts          All Firestore reads/writes + realtime subscriptions
    ai/groq.ts, ai/gemini.ts  AI provider wrappers
    ai/systemPrompts.ts       Every prompt sent to the models, with safety framing
    aiClient.ts, aiContext.ts Client helpers for calling the API routes
    healthScore.ts            Transparent dashboard health-score heuristic
    rateLimit.ts               Best-effort in-memory rate limiter
  hooks/                       Realtime Firestore hooks (useVitals, useMedications, …)
  types/index.ts                Shared domain types
firestore.rules                 Per-user data isolation rules
```

---

## Getting started locally

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com/) → **Add project**.
2. **Build → Authentication → Get started.** Enable **Email/Password** and **Google** sign-in providers.
3. **Build → Firestore Database → Create database** (start in production mode — the included rules lock it down).
4. **Project settings → General → Your apps → Add app → Web.** Copy the `firebaseConfig` values into `.env.local` (see step 4).
5. **Project settings → Service accounts → Generate new private key.** This downloads a JSON file — you'll need three fields from it (`project_id`, `client_email`, `private_key`) for the Admin SDK.
6. Deploy the security rules: either paste `firestore.rules` into **Firestore Database → Rules** in the console and click **Publish**, or with the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add   # select your project
   firebase deploy --only firestore:rules
   ```

### 3. Get free AI API keys

- **Groq:** [console.groq.com/keys](https://console.groq.com/keys) → create a free API key.
- **Gemini:** [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → create a free API key.

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in every value in `.env.local` — see the comments in that file for exactly where each one comes from. The app will still run and the landing/auth UI will render without them, but sign-in, data storage, and every AI feature require them.

### 5. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`.

### 6. Verify the build (optional but recommended before deploying)

```bash
npm run lint
npm run build
```

---

## Deploying to Vercel

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. In [Vercel](https://vercel.com/new), **Import Project** and select the repo. Vercel auto-detects Next.js — no build config changes needed.
3. Under **Environment Variables**, add every variable from `.env.example` (same values as your `.env.local`). Do this for all environments (Production, Preview, Development) you plan to use.
4. Deploy. Vercel builds and hosts both the frontend and the `/api/*` serverless functions from the same project.
5. Back in the Firebase console, go to **Authentication → Settings → Authorized domains** and add your Vercel domain (e.g. `your-app.vercel.app`) so sign-in works in production.

That's it — no separate backend to deploy. Firestore is your database, Vercel serves the app and the API routes.

---

## Safety & disclaimers

Vitalis is designed with a deliberately cautious AI safety posture, enforced
in `src/lib/ai/systemPrompts.ts`:

- The copilot never outputs a definitive diagnosis or prescribes/adjusts medication dosages.
- The symptom checker and every chat mode share an explicit list of emergency "red flag" symptoms (chest pain, stroke signs, severe bleeding, anaphylaxis, suicidal intent, etc.) — when a message plausibly matches, the model is instructed to lead with "seek emergency care now" and the UI surfaces a one-tap call-911 button.
- All AI responses are framed as general information, with recurring nudges toward professional care.
- A persistent Emergency button is available throughout the authenticated app.

That said: **this is a demonstration product, not a certified medical
device, and it is not HIPAA-compliant out of the box.** If you intend to
handle real patient health information in a regulated context, you would
additionally need, at minimum: a signed BAA with Firebase/Google Cloud (or a
HIPAA-eligible hosting stack), audit logging, encryption-at-rest attestation
review, a formal risk assessment, and legal review — none of which is in
scope here.

The in-memory rate limiter (`src/lib/rateLimit.ts`) is a best-effort guard
against runaway client loops, not a hard multi-instance limit — Vercel
serverless functions can run as multiple concurrent instances. For strict
production rate limiting, back it with Upstash Redis or a Firestore counter.

---

## Roadmap ideas

Things a next iteration would tackle: push/email medication reminders (via
a scheduled Vercel Cron hitting a `/api/reminders` route), PDF export of
insights/vitals for appointments, wearable device sync (Apple Health /
Google Fit), multi-language support, and a proper server-enforced rate
limiter.

## License

Built as a demonstration product. Use it as a starting point for your own project.
