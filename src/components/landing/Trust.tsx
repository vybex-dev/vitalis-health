"use client";

import { motion } from "framer-motion";
import { Lock, ShieldAlert, Stethoscope } from "lucide-react";

const POINTS = [
  {
    icon: Stethoscope,
    title: "Not a replacement for your doctor",
    body: "Vitalis explains, organizes, and flags — it never issues a diagnosis or prescribes treatment. Anything that sounds serious is met with a clear recommendation to see a clinician, and anything urgent tells you to seek emergency care.",
  },
  {
    icon: Lock,
    title: "Your data stays yours",
    body: "Every reading, message, and journal entry is stored under your account only. Nothing is sold, and nothing is shared with third parties for advertising.",
  },
  {
    icon: ShieldAlert,
    title: "Built with a low tolerance for false calm",
    body: "The copilot is tuned to err toward caution — when something could be serious, it says so plainly instead of softening it to sound reassuring.",
  },
];

export function Trust() {
  return (
    <section id="safety" className="mx-auto max-w-6xl px-5 py-20">
      <div className="mb-12 max-w-xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-coral">Safety, plainly stated</p>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          What Vitalis is — and isn&apos;t.
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {POINTS.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="rounded-2xl border border-border bg-teal-deep p-6 text-porcelain/85"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-white/10 text-porcelain">
              <p.icon className="size-5" />
            </div>
            <h3 className="font-display text-lg font-semibold text-white">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed">{p.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
