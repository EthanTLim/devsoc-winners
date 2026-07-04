"use client";

import { motion } from "framer-motion";
import { ExternalLink, Star } from "lucide-react";
import type { JobMatch } from "@/lib/schemas";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type JobCardProps = {
  job: JobMatch;
  selected: boolean;
  onToggleSelected: (id: string) => void;
  delay?: number;
};

function sourceDomain(job: JobMatch): string {
  if (job.source) return job.source;
  try {
    return new URL(job.url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

export function JobCard({ job, selected, onToggleSelected, delay = 0 }: JobCardProps) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="list-none"
    >
      <article
        className={cn(
          "group relative flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors",
          selected ? "border-primary/60 ring-1 ring-primary/40" : "border-border"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold leading-snug text-card-foreground">
              {job.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {job.company} &middot; {job.location}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onToggleSelected(job.id)}
            aria-pressed={selected}
            aria-label={selected ? `Unselect ${job.title} at ${job.company}` : `Select ${job.title} at ${job.company}`}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "active:scale-[0.93]",
              selected
                ? "border-primary/60 bg-primary/10 text-primary ring-1 ring-primary"
                : "border-border bg-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Star className={cn("h-4 w-4", selected && "fill-current")} />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {job.fitRationale}
        </p>

        <div className="flex items-center justify-between gap-3 pt-1">
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {sourceDomain(job)}
          </Badge>

          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-primary transition-all duration-150",
              "hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "active:scale-[0.93]"
            )}
          >
            View posting
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </article>
    </motion.li>
  );
}
