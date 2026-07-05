"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, SearchX, TriangleAlert } from "lucide-react";
import type { JobMatch, Profile } from "@/lib/schemas";
import { useAppState } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/job-card";

// Real job results list: auto-triggers /api/search-jobs on mount when there
// is a profile and no jobs yet, streams NDJSON job matches into the store as
// they arrive, and renders progressive skeleton -> card states.

type FetchState = "idle" | "loading" | "error" | "done";

// Organic, non-uniform stagger delays so cards don't reveal on a mechanical
// beat. Deterministic-ish but varied.
function staggerDelay(index: number): number {
  const base = index * 0.09;
  const jitter = ((index * 37) % 11) / 100; // small pseudo-random wobble
  return base + jitter;
}

// Signature of only the profile fields that affect job search results. Used
// to detect "profile changed since the last search" without reacting to
// unrelated edits (e.g. contact info) that shouldn't force a re-search.
function profileSearchSig(profile: Profile): string {
  return JSON.stringify({
    targetRoles: profile.targetRoles,
    skills: profile.skills,
    location: profile.location,
    preferences: profile.preferences,
  });
}

export function JobList({ jobs: propJobs }: { jobs?: JobMatch[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";

  const profile = useAppState((s) => s.profile);
  const jobs = useAppState((s) => s.jobs);
  const setJobs = useAppState((s) => s.setJobs);
  const addJob = useAppState((s) => s.addJob);
  const clearJobsOfKind = useAppState((s) => s.clearJobsOfKind);
  const searchNonce = useAppState((s) => s.searchNonce);
  const selectedJobIds = useAppState((s) => s.selectedJobIds);
  const toggleJobSelected = useAppState((s) => s.toggleJobSelected);
  const lastSearchProfileSig = useAppState((s) => s.lastSearchProfileSig);
  const setLastSearchProfileSig = useAppState((s) => s.setLastSearchProfileSig);

  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [loadingMore, setLoadingMore] = useState(false);
  const hasStarted = useRef(false);

  // In demo mode the page passes fixture jobs in as a prop. In live mode the
  // page passes the store's jobs array, which is the same data this component
  // already reads from the store, so we drive live rendering off the store and
  // only use the prop as the demo override. Potential firms live in the same
  // array but render in their own list (PotentialJobList), so exclude them here.
  const displayJobs = (isDemo ? propJobs ?? jobs : jobs).filter((j) => j.kind !== "potential");

  async function runSearch(mode: "initial" | "more" = "initial") {
    if (!profile) return;
    if (mode === "more") {
      setLoadingMore(true);
    } else {
      setFetchState("loading");
    }

    try {
      const excludeUrls =
        mode === "more" ? jobs.map((j) => j.url) : undefined;
      const res = await fetch("/api/search-jobs", {
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
        if (profile) setLastSearchProfileSig(profileSearchSig(profile));
      }
    } catch (err) {
      console.error("[job-list] search failed:", err);
      if (mode === "more") {
        // Keep the jobs already on screen; just surface a toast.
        setLoadingMore(false);
        toast.error("Couldn't load more jobs. Please try again.");
      } else {
        setFetchState("error");
      }
    }
  }

  const prevNonce = useRef(searchNonce);
  useEffect(() => {
    if (searchNonce !== prevNonce.current) {
      prevNonce.current = searchNonce;
      hasStarted.current = false;
      setFetchState("idle");
      clearJobsOfKind("listed");
    }
  }, [searchNonce, clearJobsOfKind]);

  useEffect(() => {
    if (isDemo) return;
    if (hasStarted.current) return;
    if (!profile) return;

    const currentSig = profileSearchSig(profile);
    const profileChanged =
      lastSearchProfileSig !== null && currentSig !== lastSearchProfileSig;
    const hasListedJobs = jobs.some((j) => j.kind !== "potential");

    if (profileChanged) {
      // Profile edited since the last search: keep only starred jobs, drop
      // the stale set, and reset the gate so a fresh search runs below.
      const keptStarred = jobs.filter((j) => selectedJobIds.includes(j.id));
      setJobs(keptStarred);
      hasStarted.current = true;
      runSearch();
      return;
    }

    if (hasListedJobs) return; // cache is fresh for this profile, don't re-search

    hasStarted.current = true;
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, jobs.length, isDemo, searchNonce, lastSearchProfileSig]);

  function handleRetry() {
    hasStarted.current = true;
    runSearch();
  }

  if (fetchState === "loading") {
    return (
      <div className="flex flex-col gap-4" aria-label="Loading job matches" aria-busy="true">
        <ProgressBar />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
            style={{ opacity: 1 - i * 0.12 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 items-start gap-3">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3.5 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
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
        className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-destructive/40 bg-card/50 p-10 text-center"
        role="alert"
      >
        <TriangleAlert className="h-6 w-6 text-destructive" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          Couldn&apos;t load job matches
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
        className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center"
        aria-label="No job matches yet"
      >
        <SearchX className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">No job matches yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {profile
            ? "No matches this time. Try a broader role (for example \"Software Engineer\" instead of a very specific title) or widen your location."
            : "Confirm your profile first, then live job matches will stream in here."}
        </p>
        {profile && !isDemo && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => router.push("/review")} variant="default" size="sm">
              Edit role &amp; preferences
            </Button>
            <Button onClick={handleRetry} variant="outline" size="sm">
              Search again
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3" aria-label="Job matches">
        {displayJobs.map((job, index) => (
          <JobCard
            key={job.id}
            job={job}
            selected={selectedJobIds.includes(job.id)}
            onToggleSelected={toggleJobSelected}
            delay={staggerDelay(index)}
          />
        ))}
      </ul>

      {loadingMore && (
        <div className="flex flex-col gap-3" aria-label="Loading more jobs" aria-busy="true">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5"
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
          className="self-center rounded-full"
        >
          <Plus className="size-4" aria-hidden="true" />
          {loadingMore ? "Finding more..." : "Find more jobs"}
        </Button>
      )}
    </div>
  );
}
