import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchJobsAdzuna } from "../adzuna";

function stubFetch(response: Response | Error) {
  const fetchMock =
    response instanceof Error
      ? vi.fn().mockRejectedValue(response)
      : vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function okResponse(results: unknown[]) {
  return new Response(JSON.stringify({ count: results.length, results }), {
    status: 200,
  });
}

const rawJob = {
  title: "Frontend Engineer",
  redirect_url: "https://adzuna.com/job/1",
  created: "2026-07-01T00:00:00Z",
  description: "Build UIs.",
  company: { display_name: "Acme" },
  location: { display_name: "Sydney NSW" },
};

describe("searchJobsAdzuna", () => {
  beforeEach(() => {
    vi.stubEnv("ADZUNA_APP_ID", "id");
    vi.stubEnv("ADZUNA_APP_KEY", "key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns empty results without calling the API when creds are absent", async () => {
    vi.stubEnv("ADZUNA_APP_ID", "");
    const fetchMock = stubFetch(okResponse([rawJob]));
    const res = await searchJobsAdzuna("engineer");
    expect(res).toEqual({ results: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("builds the search URL from query, location, and freshness options", async () => {
    const fetchMock = stubFetch(okResponse([]));
    await searchJobsAdzuna("react developer", { where: "Sydney", maxDaysOld: 7, resultsPerPage: 5 });
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("what")).toBe("react developer");
    expect(url.searchParams.get("where")).toBe("Sydney");
    expect(url.searchParams.get("max_days_old")).toBe("7");
    expect(url.searchParams.get("results_per_page")).toBe("5");
  });

  it("maps raw results to the shared search-result shape", async () => {
    stubFetch(okResponse([rawJob]));
    const res = await searchJobsAdzuna("engineer");
    expect(res.results).toEqual([
      {
        title: "Frontend Engineer",
        url: "https://adzuna.com/job/1",
        publishedDate: "2026-07-01T00:00:00Z",
        text: "Build UIs.",
        company: "Acme",
        location: "Sydney NSW",
      },
    ]);
  });

  it("prepends a salary line when salary data is present", async () => {
    stubFetch(
      okResponse([{ ...rawJob, salary_min: 100000.4, salary_max: 120000.6, contract_time: "full_time" }])
    );
    const res = await searchJobsAdzuna("engineer");
    expect(res.results[0].text).toBe("AUD 100000–120001 · full_time\nBuild UIs.");
  });

  it("handles a single-ended salary range", async () => {
    stubFetch(okResponse([{ ...rawJob, salary_min: 90000 }]));
    const res = await searchJobsAdzuna("engineer");
    expect(res.results[0].text).toBe("AUD 90000\nBuild UIs.");
  });

  it("drops results with no application URL", async () => {
    stubFetch(okResponse([{ ...rawJob, redirect_url: undefined }, rawJob]));
    const res = await searchJobsAdzuna("engineer");
    expect(res.results).toHaveLength(1);
  });

  it("returns empty results (never throws) on an API error response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(new Response("boom", { status: 500 }));
    const res = await searchJobsAdzuna("engineer");
    expect(res).toEqual({ results: [] });
  });

  it("returns empty results (never throws) when fetch itself fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(new Error("network down"));
    const res = await searchJobsAdzuna("engineer");
    expect(res).toEqual({ results: [] });
  });
});
