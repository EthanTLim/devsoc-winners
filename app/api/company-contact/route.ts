import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchCompaniesExa, type ExaSearchResult } from "@/lib/exa";
import { OfficialContactSchema, type OfficialContact } from "@/lib/schemas";

export const runtime = "nodejs";

// Finds a company's OFFICIAL points of contact: a public careers/jobs page
// and (only if genuinely present in the page text) a publicly-listed hiring
// email. This is additive to /api/find-people (real named humans) — it never
// invents a page or an email. All output must trace back to a real Exa
// result URL/text.

const RequestSchema = z.object({
  company: z.string().min(1),
  companyUrl: z.string().optional(),
});

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const HIRING_LOCAL_PARTS = [
  "careers",
  "career",
  "jobs",
  "recruiting",
  "recruitment",
  "talent",
  "hr",
  "hello",
  "contact",
];

function registrableDomain(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return host;
  } catch {
    return null;
  }
}

// Loose "same company domain" check: exact host match or one is a subdomain
// of the other. Good enough to prefer on-domain results without needing a
// full public-suffix-list dependency.
function sameDomain(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

function isCareersLikeUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return /(career|jobs?|join-us|work-with-us|hiring|about\/contact|contact)/.test(lower);
}

function extractEmails(text: string): string[] {
  return Array.from(new Set((text.match(EMAIL_REGEX) ?? []).map((e) => e.toLowerCase())));
}

function isHiringRelevantEmail(email: string): boolean {
  const localPart = email.split("@")[0] ?? "";
  return HIRING_LOCAL_PARTS.some((p) => localPart.includes(p));
}

function pickBestResult(
  results: ExaSearchResult[],
  companyDomain: string | null
): ExaSearchResult | null {
  if (results.length === 0) return null;

  const scored = results.map((r) => {
    const resultDomain = registrableDomain(r.url);
    let score = 0;
    if (sameDomain(resultDomain, companyDomain)) score += 3;
    if (isCareersLikeUrl(r.url)) score += 2;
    return { result: r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].result;
}

function pickBestEmail(
  results: ExaSearchResult[],
  companyDomain: string | null
): { email: string; source: string } | null {
  type Candidate = { email: string; source: string; score: number };
  const candidates: Candidate[] = [];

  for (const r of results) {
    const text = r.text ?? "";
    const emails = extractEmails(text);
    const resultDomain = registrableDomain(r.url);

    for (const email of emails) {
      const emailDomain = email.split("@")[1] ?? null;
      let score = 0;
      if (sameDomain(emailDomain, companyDomain)) score += 3;
      if (sameDomain(resultDomain, companyDomain)) score += 1;
      if (isHiringRelevantEmail(email)) score += 2;
      candidates.push({ email, source: r.url, score });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return { email: best.email, source: best.source };
}

async function findOfficialContact(
  company: string,
  companyUrl: string | undefined
): Promise<OfficialContact | null> {
  const companyDomain = companyUrl ? registrableDomain(companyUrl) : null;

  const query = `"${company}" careers OR jobs OR "work with us" OR contact`;
  const { results } = await searchCompaniesExa(query, {
    numResults: 8,
    ...(companyDomain ? { includeDomains: [companyDomain] } : {}),
  });

  let usableResults = results;

  // If scoping to the company's own domain returned nothing, fall back to an
  // unscoped search so we still have a shot at a real official page.
  if (usableResults.length === 0 && companyDomain) {
    const fallback = await searchCompaniesExa(query, { numResults: 8 });
    usableResults = fallback.results;
  }

  if (usableResults.length === 0) {
    return null;
  }

  const bestPage = pickBestResult(usableResults, companyDomain);
  const bestEmail = pickBestEmail(usableResults, companyDomain);

  if (!bestPage && !bestEmail) {
    return null;
  }

  const contact: OfficialContact = {
    company,
    careersUrl: bestPage?.url,
    email: bestEmail?.email,
    source: bestPage?.url ?? bestEmail?.source,
  };

  return contact;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company, companyUrl } = RequestSchema.parse(body);

    let contact: OfficialContact | null;
    try {
      contact = await findOfficialContact(company, companyUrl);
    } catch (firstErr) {
      console.error("company-contact: first attempt failed, retrying once:", firstErr);
      contact = await findOfficialContact(company, companyUrl);
    }

    if (!contact) {
      return NextResponse.json({ contact: null });
    }

    const validated = OfficialContactSchema.parse(contact);
    return NextResponse.json({ contact: validated });
  } catch (err) {
    console.error("company-contact error:", err);
    return NextResponse.json(
      { error: "Failed to find official contact info. Please try again in a moment." },
      { status: 500 }
    );
  }
}
