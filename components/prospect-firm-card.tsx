"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Bookmark, BookmarkCheck } from "lucide-react";
import type { JobMatch } from "@/lib/schemas";
import { Badge } from "@/components/ui/badge";
import { ExpandableText } from "@/components/expandable-text";
import { cn } from "@/lib/utils";

type ProspectFirmCardProps = {
  job: JobMatch;
  selected: boolean;
  onToggleSelected: (id: string) => void;
  delay?: number;
};

export function ProspectFirmCard({ job, selected, onToggleSelected, delay = 0 }: ProspectFirmCardProps) {
  const monogram = job.company.trim().charAt(0).toUpperCase() || "?";

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
              <h3
                title={job.title}
                className="truncate text-[15px] font-semibold leading-snug text-card-foreground"
              >
                {job.title}
              </h3>
              <p
                title={`${job.company} · ${job.location}`}
                className="truncate text-sm text-muted-foreground"
              >
                {job.company} &middot; {job.location}
              </p>
              {job.hiringLikelihood && (
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-1 w-fit font-normal",
                    job.hiringLikelihood === "high"
                      ? "border-primary/60 text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {job.hiringLikelihood === "high"
                    ? "High cold-email potential"
                    : "Worth a cold email"}
                </Badge>
              )}
            </div>
          </div>

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

        <ExpandableText text={job.fitRationale} className="text-sm leading-relaxed text-muted-foreground" />

        <p className="text-xs text-muted-foreground/80">
          Not an advertised role. A direct, well-written message is your way in.
        </p>

        <div className="flex items-center justify-end pt-1">
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
            Company site
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </article>
    </motion.li>
  );
}
