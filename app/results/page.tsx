"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { JobList } from "@/components/job-list";
import { PotentialJobList } from "@/components/potential-job-list";
import { ContactPanel } from "@/components/contact-panel";
import { DraftPanel } from "@/components/draft-panel";
import { Sidebar } from "@/components/sidebar";
import { RefineBar } from "@/components/refine-bar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DEMO } from "@/lib/demo-fixtures";
import { useAppState } from "@/lib/store";
import type { JobMatch } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type SortMode = "best-match" | "newest";

const SORT_LABELS: Record<SortMode, string> = {
  "best-match": "Best match",
  newest: "Newest",
};

function sortJobs(jobs: JobMatch[], mode: SortMode): JobMatch[] {
  if (mode === "best-match") {
    return [...jobs].sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1));
  }
  // "Newest": sort by deadline date when present (as a proxy signal for
  // recency of the posting), falling back to original insertion order for
  // jobs with no stated date.
  return [...jobs].sort((a, b) => {
    const aTime = a.deadline ? Date.parse(a.deadline) : NaN;
    const bTime = b.deadline ? Date.parse(b.deadline) : NaN;
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return bTime - aTime;
  });
}

// Results page shell: jobs, contacts, drafts, refine chat. This file's
// import structure is frozen — feature agents fill in real search/refine
// wiring inside JobList/ContactPanel/DraftPanel and the useAppState store,
// not by changing what this page imports.

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";

  const storeJobs = useAppState((state) => state.jobs);
  const storeContacts = useAppState((state) => state.contacts);
  const activeContactId = useAppState((state) => state.activeContactId);

  const [refineOpen, setRefineOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("best-match");

  const jobs = isDemo ? DEMO.jobs : storeJobs;
  const contacts = isDemo ? DEMO.contacts : storeContacts;
  const activeContact =
    contacts.find((c) => c.id === activeContactId) ?? contacts[0] ?? null;

  const listedJobsCount = jobs.filter((j) => j.kind !== "potential").length;

  const sortedJobs = useMemo(() => sortJobs(jobs, sortMode), [jobs, sortMode]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />

      <main className="min-w-0 flex-1 px-8 py-10 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Your matches
              </h1>
              <p className="text-muted-foreground">
                Jobs that fit your background. People who can help.
              </p>
            </div>

            <Button
              variant="outline"
              className="rounded-full"
              aria-expanded={refineOpen}
              onClick={() => setRefineOpen((open) => !open)}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Refine search
            </Button>
          </header>

          {refineOpen && !isDemo && (
            <RefineBar onApplied={() => setRefineOpen(false)} />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr_1.1fr]">
            <section aria-labelledby="jobs-heading" className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 id="jobs-heading" className="font-medium text-foreground">
                    Jobs
                  </h2>
                  <span className="rounded-full bg-muted px-2 text-xs text-muted-foreground">
                    {listedJobsCount}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "rounded-full"
                    )}
                  >
                    {SORT_LABELS[sortMode]}
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                      <DropdownMenuItem
                        key={mode}
                        checked={sortMode === mode}
                        onClick={() => setSortMode(mode)}
                      >
                        {SORT_LABELS[mode]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <JobList jobs={sortedJobs} />

              <div className="mt-6 border-t border-border pt-5">
                <h3 className="text-sm font-semibold text-foreground">
                  Potential jobs in your area of expertise
                </h3>
                <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
                  Unlisted firms worth a direct, cold-email approach.
                </p>
                <PotentialJobList jobs={jobs} />
              </div>
            </section>

            <section aria-labelledby="contacts-heading" className="flex min-w-0 flex-col gap-3">
              <h2 id="contacts-heading" className="font-medium text-foreground">
                Contacts
              </h2>
              <ContactPanel contacts={contacts} />
            </section>

            <section aria-labelledby="draft-heading" className="flex min-w-0 flex-col gap-3 self-start lg:sticky lg:top-10">
              <h2 id="draft-heading" className="font-medium text-foreground">
                Draft
              </h2>
              <DraftPanel contact={activeContact} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
