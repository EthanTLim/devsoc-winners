import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { complete, streamComplete } from "../llm";

// llm.ts dynamically imports the Claude Agent SDK; vi.mock intercepts that
// import so these tests exercise the claude-agent-sdk provider path without
// the real SDK (or any auth) being involved.
vi.mock("@anthropic-ai/claude-agent-sdk", () => ({ query: vi.fn() }));

const { query } = await import("@anthropic-ai/claude-agent-sdk");
const queryMock = vi.mocked(query);

async function* messages(...msgs: unknown[]) {
  for (const msg of msgs) yield msg;
}

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

describe("claude-agent-sdk provider path", () => {
  beforeEach(() => {
    vi.stubEnv("LLM_PROVIDER", "claude-agent-sdk");
    queryMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("complete() returns the result message text", async () => {
    queryMock.mockReturnValue(
      messages({ type: "result", subtype: "success", result: "answer text" }) as never
    );
    const out = await complete({ system: "s", prompt: "p" });
    expect(out).toBe("answer text");
  });

  it("complete({json:true}) strips markdown fences from the result", async () => {
    queryMock.mockReturnValue(
      messages({ type: "result", subtype: "success", result: '```json\n{"a":1}\n```' }) as never
    );
    const out = await complete({ system: "s", prompt: "p", json: true });
    expect(out).toBe('{"a":1}');
  });

  it("complete() runs the query single-turn with no tools", async () => {
    queryMock.mockReturnValue(
      messages({ type: "result", subtype: "success", result: "x" }) as never
    );
    await complete({ system: "sys", prompt: "p" });
    expect(queryMock).toHaveBeenCalledWith({
      prompt: "p",
      options: { systemPrompt: "sys", maxTurns: 1, allowedTools: [] },
    });
  });

  it("complete() throws on a failure result subtype", async () => {
    queryMock.mockReturnValue(
      messages({ type: "result", subtype: "error_max_turns" }) as never
    );
    await expect(complete({ system: "s", prompt: "p" })).rejects.toThrow(
      "Claude Agent SDK query failed: error_max_turns"
    );
  });

  it("complete() throws when the query yields no result", async () => {
    queryMock.mockReturnValue(messages() as never);
    await expect(complete({ system: "s", prompt: "p" })).rejects.toThrow(
      "returned no result"
    );
  });

  it("streamComplete() forwards assistant text deltas in order", async () => {
    queryMock.mockReturnValue(
      messages(
        {
          type: "assistant",
          message: {
            content: [
              { type: "text", text: "Hel" },
              { type: "tool_use", id: "t1" },
              { type: "text", text: "lo" },
            ],
          },
        },
        { type: "result", subtype: "success", result: "Hello" }
      ) as never
    );
    const out = await readAll(streamComplete({ system: "s", prompt: "p" }));
    expect(out).toBe("Hello");
  });

  it("streamComplete() errors the stream on a failure result", async () => {
    queryMock.mockReturnValue(
      messages({ type: "result", subtype: "error_during_execution" }) as never
    );
    await expect(readAll(streamComplete({ system: "s", prompt: "p" }))).rejects.toThrow(
      "Claude Agent SDK query failed: error_during_execution"
    );
  });
});
