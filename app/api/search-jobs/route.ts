import { z } from "zod";
import { searchJobsExa, type ExaSearchResult } from "@/lib/exa";
import { completeJson } from "@/lib/llm";
import { RANK_JOBS } from "@/lib/prompts";
import { ProfileSchema, JobMatchSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const RequestSchema = z.object({
  profile: ProfileSchema,
});

// The LLM ranking pass returns jobs without an id (we assign a real uuid
// server-side so ids are always unique and never model-hallucinated).
const RankedJobSchema = JobMatchSchema.omit({ id: true, fitScore: true });
const RankedJobsSchema = z.object({
  jobs: z.array(RankedJobSchema),
});

function buildQueries(profile: z.infer<typeof ProfileSchema>): string[] {
  const role = profile.targetRoles[0] ?? "job";
  const location =
    profile.preferences.locations[0] ?? profile.location ?? "";
  const topSkill = profile.skills[0] ?? "";

  const queries = [
    `${role} ${location} job posting`.trim(),
    `${role} careers remote hiring now`.trim(),
    topSkill
      ? `hiring ${role} with ${topSkill} experience`.trim()
      : `hiring ${role} now`.trim(),
  ];

  return queries.filter((q) => q.trim().length > 0);
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profile } = RequestSchema.parse(body);

    const queries = buildQueries(profile);

    const searchResults = await withRetry(async () => {
      const responses = await Promise.all(
        queries.map((q) => searchJobsExa(q, { numResults: 10 }))
      );
      return dedupeByUrl(responses.flatMap((r) => r.results));
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
    const jobs = ranked.jobs
      .filter((job) => validUrls.has(job.url))
      .map((job) => ({
        ...job,
        id: crypto.randomUUID(),
      }));

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
