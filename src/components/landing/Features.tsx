"use client";

import { motion } from "framer-motion";
import {
  Activity,
  BookHeart,
  MessagesSquare,
  Pill,
  ScanHeart,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: MessagesSquare,
    title: "AI copilot, two speeds",
    body: "Ask a quick question and get an instant answer, or switch to Deep analysis for a more thorough, context-aware read on what's going on.",
  },
  {
    icon: Activity,
    title: "Vitals, charted automatically",
    body: "Log blood pressure, heart rate, glucose, sleep, and more. Vitalis charts the trend so patterns are obvious, not buried in a notes app.",
  },
  {
    icon: Pill,
    title: "Medication schedule that sticks",
    body: "Set dosage and timing once. Vitalis tracks what's due, what's taken, and keeps a clean adherence history to bring to appointments.",
  },
  {
    icon: ScanHeart,
    title: "Interactive symptom checker",
    body: "Point to where it hurts on a 3D body map, describe it, and get a plain-language urgency read — with clear signals for when to seek care now.",
  },
  {
    icon: BookHeart,
    title: "A journal that listens back",
    body: "Log mood and symptoms daily. Vitalis surfaces recurring patterns so you walk into appointments with the full picture, not fragments.",
  },
  {
    icon: Sparkles,
    title: "Weekly insight reports",
    body: "Every week, Vitalis reads your logged data and writes a short, honest summary: what's steady, what's worth watching, what to ask about.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-20">
      <div className="mb-12 max-w-xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-coral">What it does</p>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Six tools. One clear picture of your health.
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-sage-light text-sage-dark">
              <f.icon className="size-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
