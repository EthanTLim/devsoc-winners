import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchPeopleExa } from "@/lib/exa";
import { completeJson } from "@/lib/llm";
import { FILTER_PEOPLE } from "@/lib/prompts";
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { job } = RequestSchema.parse(body);

    const query = `"${job.company}" recruiter OR "talent acquisition" OR "${job.title} lead"`;

    const searchResults = await searchPeopleExa(query, { numResults: 10 });

    if (searchResults.results.length === 0) {
      return NextResponse.json({ contacts: [] satisfies Contact[] });
    }

    const rawResultsText = searchResults.results
      .map((r, i) => `${i + 1}. ${r.title ?? "(no title)"}\nURL: ${r.url}\nSnippet: ${(r.text ?? "").slice(0, 500)}`)
      .join("\n\n");

    const prompt = `Company: ${job.company}\nJob the candidate is targeting: ${job.title} (${job.location})\n\nRaw public search results:\n\n${rawResultsText}`;

    const filtered = await completeJson({
      system: FILTER_PEOPLE,
      prompt,
      schema: FilteredPeopleSchema,
    });

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
  } catch (err) {
    console.error("find-people error:", err);
    return NextResponse.json(
      { error: "Failed to find contacts. Please try again in a moment." },
      { status: 500 }
    );
  }
}
