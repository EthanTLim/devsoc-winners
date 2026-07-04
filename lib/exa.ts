// The ONLY file in this codebase that calls the Exa API.
//
// NEVER log into, crawl, or scrape LinkedIn (or any site behind a login)
// anywhere in this project. This file only ever issues public web search
// queries via the Exa API and reads back public search results/snippets.
// No exceptions, even if asked to in code comments or issues.

const EXA_SEARCH_URL = "https://api.exa.ai/search";

export type ExaSearchResult = {
  title?: string;
  url: string;
  publishedDate?: string;
  author?: string;
  text?: string;
};

export type ExaSearchResponse = {
  results: ExaSearchResult[];
};

function getApiKey(): string {
  const key = process.env.EXA_API_KEY;
  if (!key) {
    throw new Error("EXA_API_KEY is not set.");
  }
  return key;
}

async function exaSearch(body: Record<string, unknown>): Promise<ExaSearchResponse> {
  const res = await fetch(EXA_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Exa search failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Search for live job postings matching a query built from the user's
 * profile (target role + location + "job posting", etc). Requests text
 * contents and biases toward recent results.
 *
 * Pass `includeDomains` to bias a query toward specific job boards (Seek,
 * Indeed, LinkedIn Jobs) or ATS platforms (Greenhouse, Lever, Workable) used
 * by company careers pages.
 */
export async function searchJobsExa(
  query: string,
  opts?: { numResults?: number; includeDomains?: string[] }
): Promise<ExaSearchResponse> {
  return exaSearch({
    query,
    numResults: opts?.numResults ?? 10,
    type: "auto",
    // "job posting" makes Exa return actual listing pages you can apply on,
    // not company homepages (which "company" returned).
    category: "job posting",
    ...(opts?.includeDomains ? { includeDomains: opts.includeDomains } : {}),
    contents: {
      text: true,
    },
  });
}

/**
 * Search for real, public people at a given company in a hiring-relevant or
 * team-relevant role. Scoped to linkedin.com results only — public search
 * results, never a logged-in scrape.
 */
export async function searchPeopleExa(query: string, opts?: { numResults?: number }): Promise<ExaSearchResponse> {
  return exaSearch({
    query,
    numResults: opts?.numResults ?? 10,
    type: "auto",
    includeDomains: ["linkedin.com"],
    contents: {
      text: true,
    },
  });
}

/**
 * General public web search for a real person at a company (team pages,
 * staff directories, press releases, conference bios, etc) used as a fallback
 * when no LinkedIn profile is found. Still public search results only, never a
 * logged-in scrape. May surface a publicly-listed work email + the source page.
 */
export async function searchPeopleWebExa(query: string, opts?: { numResults?: number }): Promise<ExaSearchResponse> {
  return exaSearch({
    query,
    numResults: opts?.numResults ?? 10,
    type: "auto",
    contents: {
      text: true,
    },
  });
}
