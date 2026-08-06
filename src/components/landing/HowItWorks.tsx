"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    n: "01",
    title: "Log what's happening",
    body: "A blood pressure reading, a missed dose, a rough night's sleep, a new symptom — takes seconds to log, from any device.",
  },
  {
    n: "02",
    title: "Ask, in your own words",
    body: "Chat with the copilot the way you'd talk to a knowledgeable friend. It already has your recent data as context — no re-explaining.",
  },
  {
    n: "03",
    title: "Understand what it means",
    body: "Get a clear, honest answer: what's likely routine, what's worth watching, and when it's time to actually call someone.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-porcelain-2/60 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 max-w-xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-coral">The loop</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Three steps, every time.
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3 md:gap-6">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <span className="font-data text-sm text-coral">{s.n}</span>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              {i < STEPS.length - 1 && (
                <div className="mt-6 hidden h-px w-full bg-gradient-to-r from-border-strong to-transparent md:block" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
