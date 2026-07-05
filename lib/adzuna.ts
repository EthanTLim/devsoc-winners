// Adzuna jobs search client. Optional secondary jobs source alongside Exa —
// falls back to an empty result set (never throws) when creds are absent or
// the request fails, so callers can treat it as a best-effort supplement.

const ADZUNA_SEARCH_URL = "https://api.adzuna.com/v1/api/jobs/au/search/1";

// Deliberately a SUPERSET of ExaSearchResult ({title?, url, publishedDate?,
// author?, text?}) so it is structurally assignable to it — the search-jobs
// route consumes it through the existing Exa pipeline, and reads
// company/location off it separately.
export type AdzunaMappedResult = {
  title?: string;
  url: string;
  publishedDate?: string;
  text?: string;
  company?: string;
  location?: string;
};

export type AdzunaSearchResponse = {
  results: AdzunaMappedResult[];
};

type AdzunaRawResult = {
  title?: string;
  redirect_url?: string;
  created?: string;
  description?: string;
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
};

type AdzunaRawResponse = {
  count?: number;
  results?: AdzunaRawResult[];
};

function getCreds(): { appId: string; appKey: string } | null {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    return null;
  }
  return { appId, appKey };
}

function mapResult(raw: AdzunaRawResult): AdzunaMappedResult | null {
  if (!raw.redirect_url) {
    return null;
  }

  const salaryParts: string[] = [];
  if (raw.salary_min || raw.salary_max) {
    const min = raw.salary_min ? Math.round(raw.salary_min) : undefined;
    const max = raw.salary_max ? Math.round(raw.salary_max) : undefined;
    if (min && max) {
      salaryParts.push(`AUD ${min}–${max}`);
    } else if (min || max) {
      salaryParts.push(`AUD ${min ?? max}`);
    }
  }
  if (raw.contract_time) {
    salaryParts.push(raw.contract_time);
  }
  const salaryLine = salaryParts.join(" · ");
  const text = [salaryLine, raw.description].filter(Boolean).join("\n");

  return {
    title: raw.title,
    url: raw.redirect_url,
    publishedDate: raw.created,
    text: text || undefined,
    company: raw.company?.display_name,
    location: raw.location?.display_name,
  };
}

/**
 * Search for live job postings via the Adzuna API (AU market). Optional
 * secondary source — returns an empty result set (never throws) if
 * ADZUNA_APP_ID/ADZUNA_APP_KEY are not set or the request fails.
 */
export async function searchJobsAdzuna(
  what: string,
  opts?: { where?: string; resultsPerPage?: number; maxDaysOld?: number }
): Promise<AdzunaSearchResponse> {
  const creds = getCreds();
  if (!creds) {
    return { results: [] };
  }

  const resultsPerPage = opts?.resultsPerPage ?? 20;
  const maxDaysOld = opts?.maxDaysOld ?? 30;

  const params = new URLSearchParams({
    app_id: creds.appId,
    app_key: creds.appKey,
    results_per_page: String(resultsPerPage),
    what,
    max_days_old: String(maxDaysOld),
    "content-type": "application/json",
  });
  if (opts?.where) {
    params.set("where", opts.where);
  }

  try {
    const res = await fetch(`${ADZUNA_SEARCH_URL}?${params.toString()}`);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[adzuna] search failed (${res.status}): ${text}`);
      return { results: [] };
    }

    const data: AdzunaRawResponse = await res.json();
    const results = (data.results ?? [])
      .map(mapResult)
      .filter((r): r is AdzunaMappedResult => r !== null);

    return { results };
  } catch (err) {
    console.error("[adzuna] search threw", err);
    return { results: [] };
  }
}
