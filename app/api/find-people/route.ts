import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchPeopleExa, searchPeopleWebExa, type ExaSearchResult } from "@/lib/exa";
import { completeJson } from "@/lib/llm";
import { FILTER_PEOPLE, FILTER_PEOPLE_WEB } from "@/lib/prompts";
import { JobMatchSchema, type Contact } from "@/lib/schemas";

export const runtime = "nodejs";

const RequestSchema = z.object({
  job: JobMatchSchema,
});

const FilteredPeopleSchema = z.object({
  people: z
    .array(
      z.object({
        name: z.string(),
        title: z.string(),
        linkedinUrl: z.string(),
      })
    )
    .max(2),
});

const FilteredWebPeopleSchema = z.object({
  people: z
    .array(
      z.object({
        name: z.string(),
        title: z.string(),
        email: z.string().nullable(),
        source: z.string(),
      })
    )
    .max(2),
});

function resultsToText(results: ExaSearchResult[]): string {
  return results
    .map(
      (r, i) =>
        `${i + 1}. ${r.title ?? "(no title)"}\nURL: ${r.url}\nSnippet: ${(r.text ?? "").slice(0, 500)}`
    )
    .join("\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { job } = RequestSchema.parse(body);

    // --- Pass 1: LinkedIn (preferred) --------------------------------------
    const liQuery = `"${job.company}" recruiter OR "talent acquisition" OR "${job.title} lead"`;
    const liResults = await searchPeopleExa(liQuery, { numResults: 10 });

    if (liResults.results.length > 0) {
      const prompt = `Company: ${job.company}\nJob the candidate is targeting: ${job.title} (${job.location})\n\nRaw public search results:\n\n${resultsToText(liResults.results)}`;
      const filtered = await completeJson({
        system: FILTER_PEOPLE,
        prompt,
        schema: FilteredPeopleSchema,
      });

      if (filtered.people.length > 0) {
        const contacts: Contact[] = filtered.people.slice(0, 2).map((person) => ({
          id: crypto.randomUUID(),
          jobId: job.id,
          name: person.name,
          title: person.title,
          company: job.company,
          linkedinUrl: person.linkedinUrl,
          draftMessage: "",
          tone: "professional",
        }));
        return NextResponse.json({ contacts });
      }
    }

    // --- Pass 2: general web fallback --------------------------------------
    // No usable LinkedIn contact found, so search the wider public web (team
    // pages, staff directories, press). Return name + optional real email +
    // the source page. Never fabricate anyone or guess an email.
    const webQuery = `"${job.company}" team OR staff OR "head of engineering" OR recruiter OR hiring contact`;
    const webResults = await searchPeopleWebExa(webQuery, { numResults: 10 });

    if (webResults.results.length === 0) {
      return NextResponse.json({ contacts: [] satisfies Contact[] });
    }

    const webPrompt = `Company: ${job.company}\nJob the candidate is targeting: ${job.title} (${job.location})\n\nRaw public web search results:\n\n${resultsToText(webResults.results)}`;
    const webFiltered = await completeJson({
      system: FILTER_PEOPLE_WEB,
      prompt: webPrompt,
      schema: FilteredWebPeopleSchema,
    });

    const contacts: Contact[] = webFiltered.people.slice(0, 2).map((person) => ({
      id: crypto.randomUUID(),
      jobId: job.id,
      name: person.name,
      title: person.title,
      company: job.company,
      email: person.email ?? undefined,
      source: person.source,
      draftMessage: "",
      tone: "professional",
    }));

    return NextResponse.json({ contacts });
  } catch (err) {
    console.error("find-people error:", err);
    return NextResponse.json(
      { error: "Failed to find contacts. Please try again in a moment." },
      { status: 500 }
    );
  }
}
