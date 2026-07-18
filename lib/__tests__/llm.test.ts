import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { completeJson, extractJsonCandidate, stripJsonFences } from "../llm";

describe("stripJsonFences", () => {
  it("strips ```json fences", () => {
    expect(stripJsonFences('```json\n{"a": 1}\n```')).toBe('{"a": 1}');
  });

  it("strips bare ``` fences", () => {
    expect(stripJsonFences('```\n{"a": 1}\n```')).toBe('{"a": 1}');
  });

  it("leaves unfenced text untouched", () => {
    expect(stripJsonFences('{"a": 1}')).toBe('{"a": 1}');
  });

  it("trims surrounding whitespace", () => {
    expect(stripJsonFences('  {"a": 1}\n')).toBe('{"a": 1}');
  });
});

describe("extractJsonCandidate", () => {
  it("extracts an object wrapped in a preamble sentence", () => {
    const raw = 'Here are the matches: {"jobs": []} Hope that helps!';
    expect(extractJsonCandidate(raw)).toBe('{"jobs": []}');
  });

  it("extracts an array wrapped in commentary", () => {
    const raw = "Sure!\n[1, 2, 3]\nLet me know if you need more.";
    expect(extractJsonCandidate(raw)).toBe("[1, 2, 3]");
  });

  it("handles nested braces", () => {
    const raw = 'Result: {"a": {"b": {"c": 1}}} done';
    expect(extractJsonCandidate(raw)).toBe('{"a": {"b": {"c": 1}}}');
  });

  it("ignores braces inside string values", () => {
    const raw = '{"text": "curly } inside"} trailing';
    expect(extractJsonCandidate(raw)).toBe('{"text": "curly } inside"}');
  });

  it("handles escaped quotes inside strings", () => {
    const raw = '{"text": "she said \\"}\\" loudly"} extra';
    expect(extractJsonCandidate(raw)).toBe('{"text": "she said \\"}\\" loudly"}');
  });

  it("strips fences before extracting", () => {
    const raw = '```json\nHere you go: {"a": 1}\n```';
    expect(extractJsonCandidate(raw)).toBe('{"a": 1}');
  });

  it("returns truncated JSON from the opener when unbalanced", () => {
    const raw = 'partial: {"a": [1, 2';
    expect(extractJsonCandidate(raw)).toBe('{"a": [1, 2');
  });

  it("returns input unchanged when no JSON opener exists", () => {
    expect(extractJsonCandidate("no json here")).toBe("no json here");
  });

  it("returns empty string for empty input", () => {
    expect(extractJsonCandidate("")).toBe("");
  });
});

// completeJson tests run against the OpenRouter provider path with fetch
// stubbed, so no network calls and no API keys are involved.
describe("completeJson", () => {
  const schema = z.object({ name: z.string() });

  function stubResponses(...contents: string[]) {
    const fetchMock = vi.fn();
    for (const content of contents) {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ choices: [{ message: { content } }] }),
          { status: 200 }
        )
      );
    }
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  beforeEach(() => {
    vi.stubEnv("LLM_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("parses a clean JSON response on the first attempt", async () => {
    const fetchMock = stubResponses('{"name": "Ada"}');
    const result = await completeJson({ system: "s", prompt: "p", schema });
    expect(result).toEqual({ name: "Ada" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recovers JSON wrapped in fences and preamble", async () => {
    stubResponses('```json\nHere it is: {"name": "Ada"}\n```');
    const result = await completeJson({ system: "s", prompt: "p", schema });
    expect(result).toEqual({ name: "Ada" });
  });

  it("retries once with the parse error appended, then succeeds", async () => {
    const fetchMock = stubResponses("not json at all", '{"name": "Ada"}');
    const result = await completeJson({ system: "s", prompt: "p", schema });
    expect(result).toEqual({ name: "Ada" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(retryBody.messages[1].content).toContain("could not be parsed");
  });

  it("retries when JSON parses but fails schema validation", async () => {
    const fetchMock = stubResponses('{"name": 42}', '{"name": "Ada"}');
    const result = await completeJson({ system: "s", prompt: "p", schema });
    expect(result).toEqual({ name: "Ada" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws a friendly error after two failed attempts", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubResponses("garbage", "more garbage");
    await expect(
      completeJson({ system: "s", prompt: "p", schema })
    ).rejects.toThrow("The AI response could not be understood");
  });
});
