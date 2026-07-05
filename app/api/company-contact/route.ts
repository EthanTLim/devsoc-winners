import { NextRequest, NextResponse } from "next/server";
import { resolveMx } from "dns/promises";
import { z } from "zod";
import { searchCompanyContactExa, type ExaSearchResult } from "@/lib/exa";
import { completeJson } from "@/lib/llm";
import { EXTRACT_COMPANY_CONTACT } from "@/lib/prompts";
import { CompanyContactSchema, JobMatchSchema, type CompanyContact } from "@/lib/schemas";

export const runtime = "nodejs";

const RequestSchema = z.object({
  job: JobMatchSchema,
});

const ExtractedContactSchema = z.object({
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resultsToText(results: ExaSearchResult[]): string {
  return results
    .map(
      (r, i) =>
        `${i + 1}. ${r.title ?? "(no title)"}\nURL: ${r.url}\nSnippet: ${(r.text ?? "").slice(0, 500)}`
    )
    .join("\n\n");
}

// Derive the company's own domain from the job posting URL (stripping a
// leading "www."), used to bias one of the two Exa searches toward the
// company's own site rather than third-party listings.
function companyDomainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Dedupe by URL, preserving first-seen order across both search passes.
function dedupeResults(results: ExaSearchResult[]): ExaSearchResult[] {
  const seen = new Set<string>();
  const deduped: ExaSearchResult[] = [];
  for (const r of results) {
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    deduped.push(r);
  }
  return deduped;
}

async function validateEmail(rawEmail: string | null): Promise<{ email: string | null; emailVerified: boolean }> {
  if (!rawEmail) return { email: null, emailVerified: false };

  const trimmed = rawEmail.trim();
  if (!EMAIL_RE.test(trimmed)) {
    return { email: null, emailVerified: false };
  }

  const domain = trimmed.split("@")[1];
  const mx = await resolveMx(domain).catch(() => []);
  return { email: trimmed, emailVerified: mx.length > 0 };
}

function validatePhone(rawPhone: string | null): { phone: string | null; phoneVerified: boolean } {
  if (!rawPhone) return { phone: null, phoneVerified: false };

  const trimmed = rawPhone.trim();
  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");

  if (digits.length < 8 || digits.length > 15) {
    return { phone: null, phoneVerified: false };
  }

  // Keep a cleaned display string: original spacing is fine, this is just a
  // sanity/format check, not a rewrite of the source string.
  return { phone: trimmed, phoneVerified: true };
}

function buildNote(company: string, missing: { email: boolean; phone: boolean; address: boolean }): string | null {
  const missingParts: string[] = [];
  if (missing.email) missingParts.push("email");
  if (missing.phone) missingParts.push("office phone");
  if (missing.address) missingParts.push("office address");

  if (missingParts.length === 0) return null;

  const joined =
    missingParts.length === 1
      ? missingParts[0]
      : `${missingParts.slice(0, -1).join(", ")} or ${missingParts[missingParts.length - 1]}`;

  return `Couldn't confidently find a company ${joined} for ${company}. Reach out to a named contact above instead.`;
}

export async function POST(req: NextRequest) {
  let job: z.infer<typeof JobMatchSchema> | undefined;

  try {
    const body = await req.json();
    const parsed = RequestSchema.parse(body);
    job = parsed.job;

    const domain = companyDomainFromUrl(job.url);

    const generalQuery = `"${job.company}" contact email phone office address`;
    const [generalResults, domainResults] = await Promise.all([
      searchCompanyContactExa(generalQuery, { numResults: 8 }),
      domain
        ? searchCompanyContactExa("contact OR about", { numResults: 8, includeDomains: [domain] })
        : Promise.resolve({ results: [] }),
    ]);

    const combined = dedupeResults([...generalResults.results, ...domainResults.results]);

    if (combined.length === 0) {
      const empty: CompanyContact = {
        jobId: job.id,
        company: job.company,
        email: null,
        emailVerified: false,
        phone: null,
        phoneVerified: false,
        address: null,
        note: buildNote(job.company, { email: true, phone: true, address: true }),
        sourceUrl: null,
      };
      return NextResponse.json(CompanyContactSchema.parse(empty));
    }

    const prompt = `Company: ${job.company}\n\nRaw public web search results:\n\n${resultsToText(combined)}`;
    const extracted = await completeJson({
      system: EXTRACT_COMPANY_CONTACT,
      prompt,
      schema: ExtractedContactSchema,
    });

    const { email, emailVerified } = await validateEmail(extracted.email);
    const { phone, phoneVerified } = validatePhone(extracted.phone);
    const address = extracted.address && extracted.address.trim() ? extracted.address.trim() : null;

    const note = buildNote(job.company, {
      email: email === null,
      phone: phone === null,
      address: address === null,
    });

    const companyContact: CompanyContact = {
      jobId: job.id,
      company: job.company,
      email,
      emailVerified,
      phone,
      phoneVerified,
      address,
      note,
      sourceUrl: combined[0]?.url ?? null,
    };

    return NextResponse.json(CompanyContactSchema.parse(companyContact));
  } catch (err) {
    console.error("company-contact error:", err);

    // The app must never white-screen: return a graceful, honest fallback
    // rather than an error status, mirroring the "no contacts found" empty
    // state used elsewhere in the contacts pipeline.
    const fallback: CompanyContact = {
      jobId: job?.id ?? "",
      company: job?.company ?? "",
      email: null,
      emailVerified: false,
      phone: null,
      phoneVerified: false,
      address: null,
      note: "Couldn't look up company contact details right now.",
      sourceUrl: null,
    };
    return NextResponse.json(CompanyContactSchema.parse(fallback));
  }
}
