import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  searchCompaniesExa,
  searchJobsExa,
  searchPeopleExa,
  searchPeopleWebExa,
} from "../exa";

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function okResponse(results: unknown[] = []) {
  return new Response(JSON.stringify({ results }), { status: 200 });
}

function sentBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(init.body as string);
}

describe("exa client", () => {
  beforeEach(() => {
    vi.stubEnv("EXA_API_KEY", "test-exa-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("searchJobsExa targets the job-posting category with text contents", async () => {
    const fetchMock = stubFetch(okResponse());
    await searchJobsExa("react engineer sydney job posting");
    const body = sentBody(fetchMock);
    expect(body.category).toBe("job posting");
    expect(body.numResults).toBe(10);
    expect(body.contents).toEqual({ text: true });
    expect(body.includeDomains).toBeUndefined();
  });

  it("searchJobsExa passes includeDomains and startPublishedDate when given", async () => {
    const fetchMock = stubFetch(okResponse());
    await searchJobsExa("query", {
      numResults: 5,
      includeDomains: ["seek.com.au"],
      startPublishedDate: "2026-06-01",
    });
    const body = sentBody(fetchMock);
    expect(body.numResults).toBe(5);
    expect(body.includeDomains).toEqual(["seek.com.au"]);
    expect(body.startPublishedDate).toBe("2026-06-01");
  });

  it("searchPeopleExa is restricted to linkedin.com results", async () => {
    const fetchMock = stubFetch(okResponse());
    await searchPeopleExa("Acme recruiter");
    expect(sentBody(fetchMock).includeDomains).toEqual(["linkedin.com"]);
  });

  it("searchPeopleWebExa (fallback) has no domain restriction", async () => {
    const fetchMock = stubFetch(okResponse());
    await searchPeopleWebExa("Acme engineering team page");
    expect(sentBody(fetchMock).includeDomains).toBeUndefined();
  });

  it("searchCompaniesExa uses the company category", async () => {
    const fetchMock = stubFetch(okResponse());
    await searchCompaniesExa("boutique dev agencies sydney");
    expect(sentBody(fetchMock).category).toBe("company");
  });

  it("authenticates with the x-api-key header", async () => {
    const fetchMock = stubFetch(okResponse());
    await searchJobsExa("query");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("test-exa-key");
  });

  it("returns the parsed results payload", async () => {
    const results = [{ url: "https://example.com/job", title: "Engineer" }];
    stubFetch(okResponse(results));
    const res = await searchJobsExa("query");
    expect(res.results).toEqual(results);
  });

  it("throws when EXA_API_KEY is not set", async () => {
    vi.stubEnv("EXA_API_KEY", "");
    stubFetch(okResponse());
    await expect(searchJobsExa("query")).rejects.toThrow("EXA_API_KEY is not set");
  });

  it("throws with the status code on a failed request", async () => {
    stubFetch(new Response("rate limited", { status: 429 }));
    await expect(searchJobsExa("query")).rejects.toThrow("Exa search failed (429)");
  });
});
