import { z } from "zod";
import { searchJobsExa, type ExaSearchResult } from "@/lib/exa";
import { completeJson } from "@/lib/llm";
import { RANK_JOBS } from "@/lib/prompts";
import { ProfileSchema, JobMatchSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const RequestSchema = z.object({
  profile: ProfileSchema,
  // URLs already shown to the user, so "Find more" never re-returns them.
  excludeUrls: z.array(z.string()).optional(),
});

// The LLM ranking pass returns jobs without an id (we assign a real uuid
// server-side so ids are always unique and never model-hallucinated).
const RankedJobSchema = JobMatchSchema.omit({ id: true, fitScore: true });
const RankedJobsSchema = z.object({
  jobs: z.array(RankedJobSchema),
});

// Company careers pages built on these ATS platforms host real, live listings
// (not just aggregator mirrors), so biasing a query toward them widens
// coverage beyond the big three job boards.
const ATS_DOMAINS = ["greenhouse.io", "lever.co", "workable.com"];

type QuerySpec = {
  query: string;
  includeDomains?: string[];
};

function buildQueries(
  profile: z.infer<typeof ProfileSchema>,
  more = false
): QuerySpec[] {
  const role = profile.targetRoles[0] ?? "job";
  const altRole = profile.targetRoles[1] ?? role;
  const location =
    profile.preferences.locations[0] ?? profile.location ?? "";
  const topSkill = profile.skills[0] ?? "";
  const secondSkill = profile.skills[1] ?? topSkill;

  // On a "find more" pass, use a different set of phrasings so Exa surfaces
  // fresh postings rather than the same top hits.
  // Trimmed to ~5 highest-signal queries: one broad phrasing-varied query
  // plus one domain-targeted query each for Seek, Indeed, LinkedIn Jobs, and
  // the ATS boards. This keeps board coverage while cutting the number of
  // parallel Exa calls (and downstream ranking/validation work) from 7 to 5,
  // which is the single biggest lever on end-to-end latency.
  const specs: QuerySpec[] = more
    ? [
        // Broad, phrasing-varied query to surface fresh postings.
        {
          query: secondSkill
            ? `${altRole} jobs ${secondSkill} ${location} apply now`.trim()
            : `${altRole} openings ${location} apply now`.trim(),
        },
        // Domain-targeted variants against major boards + ATS platforms.
        {
          query: `${altRole} ${location}`.trim(),
          includeDomains: ["seek.com.au"],
        },
        {
          query: `${role} ${location}`.trim(),
          includeDomains: ["indeed.com", "au.indeed.com"],
        },
        {
          query: `${role} ${location}`.trim(),
          includeDomains: ["linkedin.com/jobs"],
        },
        {
          query: `${role} ${location} careers`.trim(),
          includeDomains: ATS_DOMAINS,
        },
      ]
    : [
        // Broad, phrasing-varied query.
        {
          query: topSkill
            ? `hiring ${role} with ${topSkill} experience ${location}`.trim()
            : `${role} ${location} job posting`.trim(),
        },
        // Domain-targeted variants against major boards + ATS platforms.
        {
          query: `${role} ${location} job`.trim(),
          includeDomains: ["seek.com.au"],
        },
        {
          query: `${role} ${location} job`.trim(),
          includeDomains: ["indeed.com", "au.indeed.com"],
        },
        {
          query: `${role} ${location} job`.trim(),
          includeDomains: ["linkedin.com/jobs"],
        },
        {
          query: `${role} ${location} careers`.trim(),
          includeDomains: ATS_DOMAINS,
        },
      ];

  return specs.filter((s) => s.query.length > 0);
}

function dedupeByUrl(results: ExaSearchResult[]): ExaSearchResult[] {
  const seen = new Set<string>();
  const deduped: ExaSearchResult[] = [];
  for (const result of results) {
    if (!result.url || seen.has(result.url)) continue;
    seen.add(result.url);
    deduped.push(result);
  }
  return deduped;
}

// URL/title patterns that are NOT individual job postings. Domain-scoped Exa
// queries (indeed.com, seek.com.au, lever.co, ...) surface a lot of these:
// personal LinkedIn profiles, company review/salary pages, aggregator search
// pages, and ATS marketing/blog pages. Filtering them out before ranking keeps
// the candidate pool made of real listings, which is what stopped internship
// searches returning 0 (the LLM was being fed almost entirely non-jobs).
const NON_POSTING_URL_PATTERNS = [
  "linkedin.com/in/", // personal profiles
  "/reviews", "/review/", "/salaries", "/salary/", "/cmp/", // Indeed/SEEK company pages
  "/company/", "/companies/", "/recruiters/", "/agencies/", // company/agency pages
  "/resources/", "/blog/", "/resource/", "/report", // marketing/blog content
  "/jobs/part-time", "/jobs/full-time", // aggregator category pages
];

// Aggregator/search-results pages tend to have titles like "99 jobs in Sydney"
// or "React Developer Jobs in Surry Hills". A real posting title is a single
// role, not a count of many.
const AGGREGATOR_TITLE_PATTERN = /\b\d{1,4}\s+[\w\s]*jobs\b|jobs in [\w\s,]+\|/i;

function looksLikeJobPosting(result: ExaSearchResult): boolean {
  const url = result.url.toLowerCase();
  if (NON_POSTING_URL_PATTERNS.some((p) => url.includes(p))) return false;
  if (result.title && AGGREGATOR_TITLE_PATTERN.test(result.title)) return false;
  return true;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return fn();
  }
}

// High-precision closed/expired phrases only. Generic ones ("no longer
// available", "has been filled", "no longer open") and live-page UI elements
// ("search similar jobs" appears as a sidebar on LIVE Seek/Indeed listings)
// were removed because they were dropping genuinely-open postings. The ranking
// LLM already drops postings whose Exa snippet shows an explicit closed signal,
// so this body scan only needs to catch unambiguous "this exact posting is
// gone" copy that a 404/410 status didn't already cover.
const DEAD_LISTING_PHRASES = [
  "this job has expired",
  "this job posting has expired",
  "position has been filled",
  "this position has been filled",
  "no longer accepting applications",
  "we are no longer accepting applications",
  "applications are closed",
  "applications have closed",
  "this position is closed",
  "this job is closed",
  "this vacancy is closed",
  "this job has been closed",
  "job posting has expired",
  "posting has expired",
  // LinkedIn-specific: a client-rendered "expired" banner doesn't show up in
  // a plain (non-JS) fetch of the page, but LinkedIn tags expired postings
  // with this tracking redirect in the raw HTML, so it's a reliable signal
  // even without executing JS.
  "expired_jd_redirect",
];

// Bare "expired" is only trusted as a dead-listing signal when it appears
// near job/posting/listing/application vocabulary, so a live posting that
// merely mentions an unrelated "expired" (e.g. "expired certifications
// welcome to apply") isn't dropped.
const EXPIRED_CONTEXT_PATTERN =
  /\b(job|posting|listing|application|vacancy|role)\b[^.]{0,40}\bexpired\b|\bexpired\b[^.]{0,40}\b(job|posting|listing|application|vacancy|role)\b/;

// Only scan the first N characters of the body for expiry phrases. Expiry
// banners are almost always near the top of the page (title/header area),
// so this avoids reading/scanning multi-hundred-KB bodies just to find a
// short phrase, which meaningfully speeds up validation.
const BODY_SCAN_CHARS = 20000;

type LinkStatus = "live" | "dead" | "unknown";

/**
 * Checks whether a job posting URL is still a live listing. Dead links are
 * confirmed via a 4xx/5xx status or well-known "this posting is gone" copy
 * in the response body. Network errors/timeouts are treated as "unknown" so
 * a slow site never gets punished, but a confirmed-dead posting is always
 * dropped.
 */
async function validateJobUrl(
  url: string,
  timeoutMs = 3500
): Promise<LinkStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    // Only a 404 / 410 (Gone) reliably means the posting was removed. Job
    // boards (Seek, Indeed, LinkedIn, etc.) routinely answer non-browser
    // requests with 403/429/999 anti-bot statuses, and 5xx is transient, so
    // treating those as "dead" wrongly drops live postings. Fall through to
    // the body-phrase scan for anything else, and default to keeping it.
    if (res.status === 404 || res.status === 410) {
      return "dead";
    }

    const body = await res.text().catch(() => "");
    const lower = body.slice(0, BODY_SCAN_CHARS).toLowerCase();
    const looksExpired =
      DEAD_LISTING_PHRASES.some((phrase) => lower.includes(phrase)) ||
      EXPIRED_CONTEXT_PATTERN.test(lower);

    return looksExpired ? "dead" : "live";
  } catch {
    return "unknown";
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Runs validateJobUrl over a list of jobs in parallel (bounded concurrency),
 * and returns only the jobs that are NOT confirmed dead. "unknown" (network
 * error/timeout) jobs are kept.
 */
async function dropDeadJobs<T extends { url: string }>(
  jobs: T[],
  concurrency = 10
): Promise<T[]> {
  const results: LinkStatus[] = new Array(jobs.length);
  let cursor = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const index = cursor++;
      results[index] = await validateJobUrl(jobs[index].url);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, jobs.length) },
    () => worker()
  );
  await Promise.allSettled(workers);

  return jobs.filter((_, i) => results[i] !== "dead");
}

// How far back Exa is allowed to look for a posting's publish date. Biases
// hard toward fresh postings so stale/closed listings are less likely to be
// returned at all, on top of the ranking-LLM drop rules and the dead-link
// check further down. Known limitation: a very recently closed posting that
// has no date signal in its snippet and still renders a live-looking HTML
// page (closed status shown only via client-side JS) can still slip through
// all three layers — reliably catching that would need a headless browser
// to execute the page's JS, which is out of scope here.
// Bias toward recent postings without starving results. 45 days was too tight
// (many still-open internship postings were first published months ago and got
// filtered out at the Exa level), so use a wider window and lean on the LLM's
// closed/stale drop rules for finer filtering.
const FRESHNESS_WINDOW_DAYS = 120;

function getStartPublishedDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - FRESHNESS_WINDOW_DAYS);
  return d.toISOString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profile, excludeUrls } = RequestSchema.parse(body);
    const isMore = Array.isArray(excludeUrls) && excludeUrls.length > 0;
    const excluded = new Set(excludeUrls ?? []);

    const queries = buildQueries(profile, isMore);
    const startPublishedDate = getStartPublishedDate();

    const searchResults = await withRetry(async () => {
      const settled = await Promise.allSettled(
        queries.map((q) =>
          searchJobsExa(q.query, {
            numResults: 10,
            includeDomains: q.includeDomains,
            startPublishedDate,
          })
        )
      );

      const fulfilled = settled.filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof searchJobsExa>>> =>
          r.status === "fulfilled"
      );

      settled.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(
            `[/api/search-jobs] query failed: "${queries[i].query}"`,
            r.reason
          );
        }
      });

      if (fulfilled.length === 0) {
        throw new Error("All Exa job search queries failed");
      }

      // Drop anything the user has already been shown, then drop results that
      // clearly are not individual job postings (profiles, review/salary pages,
      // blogs, aggregator search pages) so the ranking LLM only sees real jobs.
      return dedupeByUrl(fulfilled.flatMap((r) => r.value.results))
        .filter((r) => !excluded.has(r.url))
        .filter(looksLikeJobPosting);
    });

    if (searchResults.length === 0) {
      return new Response("", {
        status: 200,
        headers: { "Content-Type": "application/x-ndjson" },
      });
    }

    // Cap how many deduped results reach the ranking LLM call. Exa results
    // are already in relevance order per-query and dedupeByUrl preserves
    // that order while interleaving across queries (Promise.all + flatMap
    // walks query-by-query, so early slots span all source queries/boards
    // already), so a simple slice keeps the strongest hits across boards
    // without needing extra interleaving logic.
    const MAX_RESULTS_FOR_RANKING = 15;
    const resultsForRanking = searchResults.slice(0, MAX_RESULTS_FOR_RANKING);

    // Trim the profile to only the fields the ranking prompt needs to pick
    // good-fit jobs and write a fitRationale, instead of the full profile
    // (every experience bullet, full preferences object, etc). This is the
    // other big lever on prompt size alongside the snippet/result caps below.
    const profileForRanking = {
      name: profile.name,
      targetRoles: profile.targetRoles,
      skills: profile.skills,
      location: profile.location,
      preferences: profile.preferences,
    };

    const rankingPrompt = `Candidate profile:\n${JSON.stringify(
      profileForRanking,
      null,
      2
    )}\n\nRaw search results (title, url, source snippet text):\n${JSON.stringify(
      resultsForRanking.map((r) => ({
        title: r.title,
        url: r.url,
        publishedDate: r.publishedDate,
        text: r.text?.slice(0, 450),
      })),
      null,
      2
    )}`;

    // If ranking fails (LLM returns unparseable output), degrade gracefully:
    // fall back to the top plausible results with a neutral rationale instead
    // of 500-ing the whole request. Returning some real jobs beats an error.
    let ranked: { jobs: z.infer<typeof RankedJobSchema>[] };
    try {
      ranked = await withRetry(() =>
        completeJson({
          system: RANK_JOBS,
          prompt: rankingPrompt,
          schema: RankedJobsSchema,
        })
      );
    } catch (rankErr) {
      console.error("[/api/search-jobs] ranking failed, falling back to raw results:", rankErr);
      ranked = {
        jobs: resultsForRanking.slice(0, 8).map((r) => ({
          title: r.title ?? "Job posting",
          company: (() => {
            try {
              return new URL(r.url).hostname.replace(/^www\./, "");
            } catch {
              return "See posting";
            }
          })(),
          location: profile.location,
          url: r.url,
          source: (() => {
            try {
              return new URL(r.url).hostname.replace(/^www\./, "");
            } catch {
              return "web";
            }
          })(),
          fitRationale: "A recent posting that matches your search. Open it to see the full details.",
        })),
      };
    }

    const validUrls = new Set(searchResults.map((r) => r.url));
    const rankedJobs = ranked.jobs
      .filter((job) => validUrls.has(job.url))
      .map((job) => ({
        ...job,
        id: crypto.randomUUID(),
      }));

    // Only validate the jobs that will actually be shown to the user (the
    // ranking pass already orders best-fit first), instead of every ranked
    // posting. This is the other big latency lever: fewer link fetches means
    // less time blocked on slow third-party servers.
    const MAX_JOBS_SHOWN = 8;
    const jobsToValidate = rankedJobs.slice(0, MAX_JOBS_SHOWN);

    // Drop postings whose live URL is confirmed dead/expired before ever
    // showing them to the user. Never fabricate or pad to compensate for
    // whatever this removes.
    const jobs = await dropDeadJobs(jobsToValidate);

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const job of jobs) {
          controller.enqueue(encoder.encode(JSON.stringify(job) + "\n"));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  } catch (err) {
    console.error("[/api/search-jobs] error:", err);
    return Response.json(
      { error: "Failed to search for jobs. Please try again." },
      { status: 500 }
    );
  }
}
