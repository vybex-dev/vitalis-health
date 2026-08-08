"use client";

import { useId } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

const D = "M0,24 L530,24 L560,6 L585,42 L610,14 L635,24 L1200,24";
const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 48;

export function HeartbeatLine({ className = "" }: { className?: string }) {
  const clipId = useId();
  const { scrollYProgress } = useScroll();
  const revealWidth = useTransform(scrollYProgress, [0, 1], [0, VIEW_WIDTH]);

  return (
    <div className={`relative h-12 w-full overflow-hidden ${className}`}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        fill="none"
        aria-hidden
      >
        {/* faint track showing the full path shape up front */}
        <path
          d={D}
          stroke="currentColor"
          className="text-border-strong"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        <clipPath id={clipId}>
          <motion.rect x={0} y={0} height={VIEW_HEIGHT} width={revealWidth} />
        </clipPath>
        <path
          d={D}
          stroke="#ff6152"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          clipPath={`url(#${clipId})`}
        />
      </svg>
    </div>
  );
}
