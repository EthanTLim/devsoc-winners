import { z } from "zod";
import { searchCompaniesExa, type ExaSearchResult } from "@/lib/exa";
import { completeJson } from "@/lib/llm";
import { DISCOVER_FIRMS } from "@/lib/prompts";
import { ProfileSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const RequestSchema = z.object({
  profile: ProfileSchema,
  // URLs already shown to the user, so "Find more" never re-returns them.
  excludeUrls: z.array(z.string()).optional(),
});

// The LLM ranking pass returns firms without an id (we assign a real uuid
// server-side so ids are always unique and never model-hallucinated).
const RankedFirmSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  url: z.string(),
  source: z.string(),
  fitRationale: z.string(),
  hiringLikelihood: z.enum(["high", "medium"]),
});
const RankedFirmsSchema = z.object({
  firms: z.array(RankedFirmSchema),
});

function buildQueries(
  profile: z.infer<typeof ProfileSchema>,
  more = false
): string[] {
  const role = profile.targetRoles[0] ?? "job";
  const location =
    profile.preferences.locations[0] ?? profile.location ?? "";
  const topSkill = profile.skills[0] ?? "";

  // On a "find more" pass, use a different set of phrasings so Exa surfaces
  // fresh companies rather than the same top hits.
  const queries = more
    ? [
        `boutique ${role} firms ${location}`.trim(),
        topSkill
          ? `${topSkill} startups ${location} hiring`.trim()
          : `startups hiring ${role} ${location}`.trim(),
        `growing ${role} companies ${location}`.trim(),
      ]
    : [
        `small ${role} companies ${location}`.trim(),
        topSkill
          ? `${topSkill} startups ${location} hiring`.trim()
          : `${role} startups ${location} hiring`.trim(),
        `boutique ${role} firms ${location}`.trim(),
      ];

  return queries.filter((q) => q.length > 0);
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
    const { profile, excludeUrls } = RequestSchema.parse(body);
    const isMore = Array.isArray(excludeUrls) && excludeUrls.length > 0;
    const excluded = new Set(excludeUrls ?? []);

    const queries = buildQueries(profile, isMore);

    const searchResults = await withRetry(async () => {
      const responses = await Promise.all(
        queries.map((q) => searchCompaniesExa(q, { numResults: 10 }))
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

    // Cap how many deduped results reach the ranking LLM call, same lever as
    // search-jobs uses to keep prompt size and latency down.
    const MAX_RESULTS_FOR_RANKING = 15;
    const resultsForRanking = searchResults.slice(0, MAX_RESULTS_FOR_RANKING);

    // Trim the profile to only the fields the ranking prompt needs to pick
    // good-fit firms and write a fitRationale, instead of the full profile.
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

    const ranked = await withRetry(() =>
      completeJson({
        system: DISCOVER_FIRMS,
        prompt: rankingPrompt,
        schema: RankedFirmsSchema,
      })
    );

    const validUrls = new Set(searchResults.map((r) => r.url));
    const rankedFirms = ranked.firms
      .filter((firm) => validUrls.has(firm.url))
      .map((firm) => ({
        ...firm,
        id: crypto.randomUUID(),
        kind: "potential" as const,
      }));

    // Company sites don't go stale/expire the way job postings do, so unlike
    // search-jobs there is no dead-link validation pass here.
    const MAX_FIRMS_SHOWN = 6;
    const firms = rankedFirms.slice(0, MAX_FIRMS_SHOWN);

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const firm of firms) {
          controller.enqueue(encoder.encode(JSON.stringify(firm) + "\n"));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  } catch (err) {
    console.error("[/api/discover-firms] error:", err);
    return Response.json(
      { error: "Failed to find potential firms. Please try again." },
      { status: 500 }
    );
  }
}
