"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl bg-ink px-8 py-16 text-center"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-coral/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-64 rounded-full bg-sage/20 blur-3xl" />

        <h2 className="relative font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Start understanding your health today.
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-sm text-porcelain/70">
          Free to start. No credit card. Your data, your account, your call.
        </p>
        <div className="relative mt-8 flex justify-center">
          <Link href="/signup">
            <Button size="lg">
              Create your free account <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
