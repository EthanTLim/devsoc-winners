import type { z } from "zod";

// The ONLY file in this codebase that imports a provider SDK or knows about
// providers at all. No component or route handler should import
// `@anthropic-ai/claude-agent-sdk` or call OpenRouter directly — always go
// through complete() / streamComplete() / completeJson() below.
//
// Provider is chosen by process.env.LLM_PROVIDER at call time:
//   - "claude-agent-sdk": uses @anthropic-ai/claude-agent-sdk `query()` in
//     single-turn non-interactive mode. Works locally via Claude Pro
//     subscription auth. Will NOT work on Vercel — that's expected.
//   - "openrouter": plain fetch to OpenRouter's chat completions endpoint.
//     This is the deployed path.
//
// CRITICAL: never reference, read, or set ANTHROPIC_API_KEY anywhere in this
// file (or anywhere else in the project). The team has no Anthropic API key;
// local Claude access is via Agent SDK subscription auth, and an
// ANTHROPIC_API_KEY in the environment would override that and break it.

type CompleteOpts = {
  system: string;
  prompt: string;
  json?: boolean;
};

type StreamOpts = {
  system: string;
  prompt: string;
};

function getProvider(): "claude-agent-sdk" | "openrouter" {
  const provider = process.env.LLM_PROVIDER;
  if (provider === "openrouter") return "openrouter";
  return "claude-agent-sdk";
}

function stripJsonFences(text: string): string {
  let cleaned = text.trim();
  // Strip ```json ... ``` or ``` ... ``` fences defensively.
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  return cleaned;
}

async function completeViaClaudeAgentSdk(opts: CompleteOpts): Promise<string> {
  const { query } = await import("@anthropic-ai/claude-agent-sdk");

  const q = query({
    prompt: opts.prompt,
    options: {
      systemPrompt: opts.system,
      maxTurns: 1,
      allowedTools: [],
    },
  });

  let result = "";
  for await (const message of q) {
    if (message.type === "result") {
      if (message.subtype === "success") {
        result = message.result;
      } else {
        throw new Error(`Claude Agent SDK query failed: ${message.subtype}`);
      }
    }
  }

  if (!result) {
    throw new Error("Claude Agent SDK query returned no result.");
  }

  return result;
}

async function completeViaOpenRouter(opts: CompleteOpts): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set but LLM_PROVIDER=openrouter.");
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.prompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) {
    throw new Error("OpenRouter response had no message content.");
  }
  return content;
}

/**
 * Single-turn text completion. Routes to the provider selected by
 * process.env.LLM_PROVIDER.
 */
export async function complete(opts: CompleteOpts): Promise<string> {
  const provider = getProvider();
  const raw =
    provider === "openrouter"
      ? await completeViaOpenRouter(opts)
      : await completeViaClaudeAgentSdk(opts);

  return opts.json ? stripJsonFences(raw) : raw;
}

/**
 * Streaming completion. Returns a ReadableStream<Uint8Array> of raw text
 * chunks, suitable for piping straight into an AI SDK / Next.js streaming
 * response.
 */
export function streamComplete(opts: StreamOpts): ReadableStream<Uint8Array> {
  const provider = getProvider();
  const encoder = new TextEncoder();

  if (provider === "openrouter") {
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const apiKey = process.env.OPENROUTER_API_KEY;
          const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat";
          if (!apiKey) {
            throw new Error("OPENROUTER_API_KEY is not set but LLM_PROVIDER=openrouter.");
          }

          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              stream: true,
              messages: [
                { role: "system", content: opts.system },
                { role: "user", content: opts.prompt },
              ],
            }),
          });

          if (!res.ok || !res.body) {
            const text = await res.text().catch(() => "");
            throw new Error(`OpenRouter stream request failed (${res.status}): ${text}`);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const parsed = JSON.parse(payload);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (typeof delta === "string" && delta) {
                  controller.enqueue(encoder.encode(delta));
                }
              } catch {
                // Ignore malformed SSE chunks; keep streaming.
              }
            }
          }

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
  }

  // claude-agent-sdk path: consume the async generator and forward
  // assistant text deltas as they arrive.
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const { query } = await import("@anthropic-ai/claude-agent-sdk");

        const q = query({
          prompt: opts.prompt,
          options: {
            systemPrompt: opts.system,
            maxTurns: 1,
            allowedTools: [],
          },
        });

        for await (const message of q) {
          if (message.type === "assistant") {
            const content = message.message?.content;
            if (Array.isArray(content)) {
              for (const block of content) {
                if (block.type === "text" && typeof block.text === "string") {
                  controller.enqueue(encoder.encode(block.text));
                }
              }
            }
          } else if (message.type === "result" && message.subtype !== "success") {
            throw new Error(`Claude Agent SDK query failed: ${message.subtype}`);
          }
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

/**
 * JSON completion helper: calls complete({json: true}), strips fences,
 * parses, and validates against the given zod schema. Retries ONCE on
 * parse/validation failure with the error appended to the prompt, then
 * throws a friendly error.
 */
export async function completeJson<T>(opts: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
}): Promise<T> {
  const attempt = async (promptToUse: string): Promise<T> => {
    const raw = await complete({ system: opts.system, prompt: promptToUse, json: true });
    const cleaned = stripJsonFences(raw);
    const parsed = JSON.parse(cleaned);
    return opts.schema.parse(parsed);
  };

  try {
    return await attempt(opts.prompt);
  } catch (firstErr) {
    const errorMessage = firstErr instanceof Error ? firstErr.message : String(firstErr);
    const retryPrompt = `${opts.prompt}\n\nYour previous response could not be parsed as valid JSON matching the required shape. Error: ${errorMessage}\n\nReturn ONLY raw JSON matching the required shape, no markdown fences, no preamble.`;

    try {
      return await attempt(retryPrompt);
    } catch {
      throw new Error(
        "The AI response could not be understood. Please try again in a moment."
      );
    }
  }
}
