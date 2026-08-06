"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/Button";

const PulseOrb = dynamic(() => import("@/components/three/PulseOrb"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse-slow rounded-full bg-coral-light/40" />,
});

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pt-14 pb-10 md:grid-cols-2 md:pt-20 md:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border-strong bg-white px-3 py-1.5 text-xs font-medium text-ink-2">
            <HeartPulse className="size-3.5 text-coral" />
            Your health, read in plain language
          </div>

          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            The calm way to keep up with your own health.
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">
            Vitalis logs your vitals, medications, and symptoms in one place, then uses AI to
            turn that data into clear next steps — without the panic spiral of searching your
            symptoms at 2am.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup">
              <Button size="lg">
                Start tracking free <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline">
                See how it works
              </Button>
            </a>
          </div>

          <p className="mt-6 text-xs text-ink-soft">
            Vitalis gives general health information, not diagnoses — it&apos;s built to sit
            alongside your clinician, not replace them.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="relative mx-auto aspect-square w-full max-w-md"
        >
          <PulseOrb />

          <div className="pointer-events-none absolute left-2 top-4 rounded-xl border border-border bg-white/90 px-3 py-2 shadow-[var(--shadow-soft)] backdrop-blur">
            <p className="text-[10px] uppercase tracking-wide text-ink-soft">Resting HR</p>
            <p className="font-data text-lg font-medium text-ink">62 <span className="text-xs text-ink-soft">bpm</span></p>
          </div>

          <div className="pointer-events-none absolute bottom-6 right-0 rounded-xl border border-border bg-white/90 px-3 py-2 shadow-[var(--shadow-soft)] backdrop-blur">
            <p className="text-[10px] uppercase tracking-wide text-ink-soft">Sleep, last night</p>
            <p className="font-data text-lg font-medium text-ink">7.4 <span className="text-xs text-ink-soft">hrs</span></p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
