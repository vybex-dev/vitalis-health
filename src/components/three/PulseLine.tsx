"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * A continuous ECG-style waveform that runs as a section divider down the
 * landing page. It's the page's structural spine: every section sits on
 * the pulse line, echoing the product's core idea (turning the pulse of
 * your health data into something legible). Amplitude reacts subtly to
 * scroll position so it feels alive rather than decorative.
 */
export function PulseLine({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const dashOffset = useTransform(scrollYProgress, [0, 1], [400, 0]);

  return (
    <div ref={ref} className={className} aria-hidden>
      <svg viewBox="0 0 1200 80" width="100%" height="48" preserveAspectRatio="none">
        <path
          d="M0,40 L340,40 L370,40 L390,8 L410,72 L430,20 L450,40 L480,40 L1200,40"
          fill="none"
          stroke="var(--color-border-strong)"
          strokeWidth="1.5"
        />
        <motion.path
          d="M0,40 L340,40 L370,40 L390,8 L410,72 L430,20 L450,40 L480,40 L1200,40"
          fill="none"
          stroke="var(--color-coral)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="400"
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
    </div>
  );
}
