"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, SearchX, TriangleAlert } from "lucide-react";
import type { JobMatch } from "@/lib/schemas";
import { useAppState } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ProspectFirmCard } from "@/components/prospect-firm-card";

// Potential-firm results list: auto-triggers /api/discover-firms on mount when
// there is a profile and no potential-kind jobs yet, streams NDJSON JobMatch
// records (kind: "potential") into the shared store as they arrive, and
// renders progressive skeleton -> card states, mirroring JobList.

type FetchState = "idle" | "loading" | "error" | "done";

// Organic, non-uniform stagger delays so cards don't reveal on a mechanical
// beat. Deterministic-ish but varied.
function staggerDelay(index: number): number {
  const base = index * 0.09;
  const jitter = ((index * 37) % 11) / 100; // small pseudo-random wobble
  return base + jitter;
}

export function PotentialJobList({ jobs: propJobs }: { jobs?: JobMatch[] }) {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";

  const profile = useAppState((s) => s.profile);
  const jobs = useAppState((s) => s.jobs);
  const addJob = useAppState((s) => s.addJob);
  const selectedJobIds = useAppState((s) => s.selectedJobIds);
  const toggleJobSelected = useAppState((s) => s.toggleJobSelected);

  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [loadingMore, setLoadingMore] = useState(false);
  const hasStarted = useRef(false);

  // In demo mode the page passes fixture jobs in as a prop. In live mode the
  // page passes the store's jobs array, which is the same data this component
  // already reads from the store, so we drive live rendering off the store and
  // only use the prop as the demo override. Either way, only potential-kind
  // firms belong in this list; listed jobs render in JobList.
  const displayJobs = (isDemo ? propJobs ?? jobs : jobs).filter((j) => j.kind === "potential");

  async function runSearch(mode: "initial" | "more" = "initial") {
    if (!profile) return;
    if (mode === "more") {
      setLoadingMore(true);
    } else {
      setFetchState("loading");
    }

    try {
      const excludeUrls =
        mode === "more" ? jobs.filter((j) => j.kind === "potential").map((j) => j.url) : undefined;
      const res = await fetch("/api/discover-firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, excludeUrls }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Search failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const job = JSON.parse(trimmed) as JobMatch;
            addJob(job);
          } catch {
            // Skip malformed lines, keep streaming.
          }
        }
      }

      if (buffer.trim()) {
        try {
          const job = JSON.parse(buffer.trim()) as JobMatch;
          addJob(job);
        } catch {
          // Ignore trailing partial line.
        }
      }

      if (mode === "more") {
        setLoadingMore(false);
      } else {
        setFetchState("done");
      }
    } catch (err) {
      console.error("[potential-job-list] search failed:", err);
      if (mode === "more") {
        // Keep the firms already on screen; just surface a toast.
        setLoadingMore(false);
        toast.error("Couldn't load more firms. Please try again.");
      } else {
        setFetchState("error");
      }
    }
  }

  useEffect(() => {
    if (isDemo) return;
    if (hasStarted.current) return;
    if (!profile || jobs.some((j) => j.kind === "potential")) return;

    hasStarted.current = true;
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, jobs.length, isDemo]);

  function handleRetry() {
    hasStarted.current = true;
    runSearch();
  }

  if (fetchState === "loading") {
    return (
      <div className="flex flex-col gap-3" aria-label="Loading potential firms" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
            style={{ opacity: 1 - i * 0.12 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  if (fetchState === "error") {
    return (
      <div
        className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-card/50 p-10 text-center"
        role="alert"
      >
        <TriangleAlert className="h-6 w-6 text-destructive" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          Couldn&apos;t load potential firms
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Something went wrong reaching the search service. Give it another try.
        </p>
        <Button onClick={handleRetry} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  if (displayJobs.length === 0) {
    return (
      <div
        className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center"
        aria-label="No potential firms yet"
      >
        <SearchX className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">No standout firms yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {profile
            ? "We could not surface small firms worth a direct approach this time. Try broadening your target role or location."
            : "Confirm your profile first, then potential firms will stream in here."}
        </p>
        {profile && !isDemo && (
          <Button onClick={handleRetry} variant="outline" size="sm">
            Search again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3" aria-label="Potential firms">
        {displayJobs.map((job, index) => (
          <ProspectFirmCard
            key={job.id}
            job={job}
            selected={selectedJobIds.includes(job.id)}
            onToggleSelected={toggleJobSelected}
            delay={staggerDelay(index)}
          />
        ))}
      </ul>

      {loadingMore && (
        <div className="flex flex-col gap-3" aria-label="Loading more potential firms" aria-busy="true">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
              style={{ opacity: 1 - i * 0.15 }}
            >
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      )}

      {!isDemo && (
        <Button
          onClick={() => runSearch("more")}
          disabled={loadingMore}
          variant="outline"
          size="sm"
          className="self-center"
        >
          <Plus className="size-4" aria-hidden="true" />
          {loadingMore ? "Finding more..." : "Find more firms"}
        </Button>
      )}
    </div>
  );
}
