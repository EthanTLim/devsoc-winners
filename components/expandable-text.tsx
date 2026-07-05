"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ExpandableTextProps = {
  text: string;
  className?: string;
  clampLines?: number;
};

export function ExpandableText({ text, className, clampLines = 2 }: ExpandableTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);

  useLayoutEffect(() => {
    function measure() {
      const el = ref.current;
      if (!el) return;
      setIsClamped(el.scrollHeight > el.clientHeight + 1);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text, expanded, clampLines]);

  return (
    <div>
      <p
        ref={ref}
        className={cn(className)}
        style={
          !expanded
            ? {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: clampLines,
                overflow: "hidden",
              }
            : undefined
        }
      >
        {text}
      </p>
      {(isClamped || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
