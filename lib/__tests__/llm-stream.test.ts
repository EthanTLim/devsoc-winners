import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { streamComplete } from "../llm";

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

function sseResponse(lines: string[]) {
  return new Response(lines.join("\n") + "\n", { status: 200 });
}

describe("streamComplete (openrouter path)", () => {
  beforeEach(() => {
    vi.stubEnv("LLM_PROVIDER", "openrouter");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("concatenates SSE content deltas into a text stream", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          'data: {"choices":[{"delta":{"content":"Hel"}}]}',
          'data: {"choices":[{"delta":{"content":"lo"}}]}',
          "data: [DONE]",
        ])
      )
    );
    const out = await readAll(streamComplete({ system: "s", prompt: "p" }));
    expect(out).toBe("Hello");
  });

  it("skips malformed SSE chunks and non-data lines without dying", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          ": comment line",
          "data: not-json-at-all",
          'data: {"choices":[{"delta":{"content":"ok"}}]}',
          "data: [DONE]",
        ])
      )
    );
    const out = await readAll(streamComplete({ system: "s", prompt: "p" }));
    expect(out).toBe("ok");
  });

  it("requests streaming from the provider", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(["data: [DONE]"]));
    vi.stubGlobal("fetch", fetchMock);
    await readAll(streamComplete({ system: "sys", prompt: "hi" }));
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body.stream).toBe(true);
    expect(body.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "hi" },
    ]);
  });

  it("errors the stream when the API key is missing", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn());
    await expect(readAll(streamComplete({ system: "s", prompt: "p" }))).rejects.toThrow(
      "OPENROUTER_API_KEY is not set"
    );
  });

  it("errors the stream on a failed provider response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("nope", { status: 401 }))
    );
    await expect(readAll(streamComplete({ system: "s", prompt: "p" }))).rejects.toThrow(
      "OpenRouter stream request failed (401)"
    );
  });
});
