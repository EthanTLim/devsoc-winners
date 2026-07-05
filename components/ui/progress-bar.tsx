"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type ProgressBarProps = {
  /** Flip to true once the real request finishes; snaps the fill to 100%. */
  complete?: boolean;
  className?: string;
};

const CAP = 92;

// Simulated determinate progress for waits with no known duration (LLM
// passes, streaming search). Climbs 0 -> ~92% on a decelerating curve so it
// never sits at 100% before the real work is done, then snaps to 100% once
// the caller signals completion via `complete`.
export function ProgressBar({ complete = false, className }: ProgressBarProps) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (complete) {
      setValue(100);
      return;
    }
    if (reduce) {
      setValue(CAP);
      return;
    }
    setValue(0);
    const id = setInterval(() => {
      setValue((v) => {
        if (v >= CAP) return v;
        const remaining = CAP - v;
        return Math.min(CAP, v + Math.max(0.4, remaining * 0.06));
      });
    }, 120);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, reduce]);

  return (
    <div
      className={cn("h-1 w-full overflow-hidden rounded-full bg-secondary", className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-full bg-primary"
        animate={{ width: `${value}%` }}
        transition={{ duration: complete ? 0.35 : 0.25, ease: "easeOut" }}
      />
    </div>
  );
}
