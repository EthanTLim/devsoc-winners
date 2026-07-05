"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Bookmark, BookmarkCheck } from "lucide-react";
import type { JobMatch } from "@/lib/schemas";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";

type JobCardProps = {
  job: JobMatch;
  selected: boolean;
  onToggleSelected: (id: string) => void;
  delay?: number;
};

function matchLabel(fitScore: number | undefined): string {
  if (fitScore === undefined) return "Match";
  if (fitScore >= 80) return "High match";
  if (fitScore >= 60) return "Good match";
  return "Match";
}

function employmentTag(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("intern")) return "Internship";
  if (lower.includes("grad")) return "Graduate";
  return "Full-time";
}

function workModeTag(remote: string | undefined): string | null {
  switch (remote) {
    case "remote":
      return "Remote";
    case "hybrid":
      return "Hybrid";
    case "onsite":
      return "Onsite";
    default:
      return null;
  }
}

export function JobCard({ job, selected, onToggleSelected, delay = 0 }: JobCardProps) {
  const remotePref = useAppState((s) => s.profile?.preferences.remote);

  const monogram = job.company.trim().charAt(0).toUpperCase() || "?";
  const tags = [
    employmentTag(job.title),
    workModeTag(remotePref),
    job.deadline ? `Apply by ${job.deadline}` : null,
  ].filter((t): t is string => Boolean(t));

  return (
    <motion.li
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="list-none"
    >
      <article
        className={cn(
          "group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/15",
          selected && "border-l-4 border-l-primary ring-1 ring-primary/30"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-sm font-semibold text-foreground"
              aria-hidden="true"
            >
              {monogram}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h3 className="truncate text-[15px] font-semibold leading-snug text-card-foreground">
                {job.title}
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                {job.company} &middot; {job.location}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {matchLabel(job.fitScore)}
            </Badge>
            <button
              type="button"
              onClick={() => onToggleSelected(job.id)}
              aria-pressed={selected}
              aria-label={selected ? `Unselect ${job.title} at ${job.company}` : `Select ${job.title} at ${job.company}`}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "active:scale-[0.93]",
                selected
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {selected ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {job.fitRationale}
        </p>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md text-sm font-medium text-primary transition-all duration-150",
              "hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "active:scale-[0.93]"
            )}
          >
            View job
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </article>
    </motion.li>
  );
}
