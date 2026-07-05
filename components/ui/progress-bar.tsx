"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type ProgressBarProps = {
  className?: string;
};

// Indeterminate progress bar for waits with no known duration (streaming
// searches, LLM passes). A sliding fill reads as "working" without implying a
// false percentage.
export function ProgressBar({ className }: ProgressBarProps) {
  const reduce = useReducedMotion();

  return (
    <div
      className={cn("h-1 w-full overflow-hidden rounded-full bg-secondary", className)}
      role="progressbar"
      aria-label="Loading"
    >
      <motion.div
        className="h-full w-1/3 rounded-full bg-primary"
        animate={reduce ? undefined : { x: ["-100%", "220%"] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
      />
    </div>
  );
}
