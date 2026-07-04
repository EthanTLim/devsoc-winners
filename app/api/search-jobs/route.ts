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
  const specs: QuerySpec[] = more
    ? [
        // Broad, phrasing-varied queries.
        { query: `${altRole} ${location} apply now`.trim() },
        {
          query: secondSkill
            ? `${role} jobs ${secondSkill} ${location}`.trim()
            : `${role} openings ${location}`.trim(),
        },
        { query: `${role} vacancy ${location} hiring`.trim() },
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
        // Broad, phrasing-varied queries.
        { query: `${role} ${location} job posting`.trim() },
        { query: `${role} careers remote hiring now`.trim() },
        {
          query: topSkill
            ? `hiring ${role} with ${topSkill} experience`.trim()
            : `hiring ${role} now`.trim(),
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

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return fn();
  }
}

const DEAD_LISTING_PHRASES = [
  "no longer available",
  "not available anymore",
  "this job has expired",
  "position has been filled",
  "job not found",
  "unfortunately we can't find that job",
  "search similar jobs",
];

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
  timeoutMs = 5000
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

    if (res.status >= 400) {
      return "dead";
    }

    const body = await res.text().catch(() => "");
    const lower = body.toLowerCase();
    const looksExpired = DEAD_LISTING_PHRASES.some((phrase) =>
      lower.includes(phrase)
    );

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
  concurrency = 6
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profile, excludeUrls } = RequestSchema.parse(body);
    const isMore = Array.isArray(excludeUrls) && excludeUrls.length > 0;
    const excluded = new Set(excludeUrls ?? []);

    const queries = buildQueries(profile, isMore);

    const searchResults = await withRetry(async () => {
      const responses = await Promise.all(
        queries.map((q) =>
          searchJobsExa(q.query, {
            numResults: 10,
            includeDomains: q.includeDomains,
          })
        )
      );
      // Drop anything the user has already been shown before ranking.
      return dedupeByUrl(responses.flatMap((r) => r.results)).filter(
        (r) => !excluded.has(r.url)
      );
    });

    if (searchResults.length === 0) {
      return new Response("", {
        status: 200,
        headers: { "Content-Type": "application/x-ndjson" },
      });
    }

    const rankingPrompt = `Candidate profile:\n${JSON.stringify(
      profile,
      null,
      2
    )}\n\nRaw search results (title, url, source snippet text):\n${JSON.stringify(
      searchResults.map((r) => ({
        title: r.title,
        url: r.url,
        publishedDate: r.publishedDate,
        text: r.text?.slice(0, 1500),
      })),
      null,
      2
    )}`;

    const ranked = await withRetry(() =>
      completeJson({
        system: RANK_JOBS,
        prompt: rankingPrompt,
        schema: RankedJobsSchema,
      })
    );

    const validUrls = new Set(searchResults.map((r) => r.url));
    const rankedJobs = ranked.jobs
      .filter((job) => validUrls.has(job.url))
      .map((job) => ({
        ...job,
        id: crypto.randomUUID(),
      }));

    // Drop postings whose live URL is confirmed dead/expired before ever
    // showing them to the user. Never fabricate or pad to compensate for
    // whatever this removes.
    const jobs = await dropDeadJobs(rankedJobs);

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
