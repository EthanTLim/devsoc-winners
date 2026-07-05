"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type FadeInProps = {
  children: ReactNode;
  /** Seconds to wait before animating in. Use increasing values on siblings
   *  to get a staggered "waterfall" reveal. */
  delay?: number;
  /** Vertical travel in px (the "lift"). */
  y?: number;
  duration?: number;
  /** Animate only the first time it enters the viewport (default true). */
  once?: boolean;
  className?: string;
};

// Shared scroll-reveal / entrance primitive for the whole app. Fades and lifts
// its children in as they scroll into view (or immediately if already above the
// fold). Honors prefers-reduced-motion by fading without movement. This is the
// building block for the landing page's waterfall reveals and the card
// entrances on the matches page.
export function FadeIn({
  children,
  delay = 0,
  y = 18,
  duration = 0.7,
  once = true,
  className,
}: FadeInProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
