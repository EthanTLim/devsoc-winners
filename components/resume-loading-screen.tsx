"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FileText } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";

const STEPS = [
  "Reading your resume...",
  "Pulling out your experience...",
  "Mapping your skills...",
  "Almost there...",
];

const STEP_INTERVAL_MS = 2200;

type ResumeLoadingScreenProps = {
  fileName: string | null;
  /** True once /api/parse-resume has actually returned; snaps the bar to 100%. */
  complete?: boolean;
};

// Full-screen takeover shown while /api/parse-resume is in flight (often
// 15-30s for a real LLM extraction pass). Cycles reassuring status copy so
// the wait doesn't read as a hang.
export function ResumeLoadingScreen({ fileName, complete = false }: ResumeLoadingScreenProps) {
  const reduce = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background/95 px-6 backdrop-blur-sm"
    >
      <motion.div
        animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        className="flex size-16 items-center justify-center rounded-2xl bg-accent"
      >
        <FileText className="size-7 text-primary" aria-hidden="true" />
      </motion.div>

      <div className="flex flex-col items-center gap-2 text-center">
        {fileName && (
          <p className="truncate text-sm text-muted-foreground">{fileName}</p>
        )}
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg font-medium text-foreground sm:text-xl"
          >
            {STEPS[stepIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      <ProgressBar complete={complete} className="w-56" />
    </motion.div>
  );
}
