import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { streamComplete } from "@/lib/llm";
import { DRAFT_MESSAGE } from "@/lib/prompts";
import { ProfileSchema, JobMatchSchema, ContactSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const RequestSchema = z.object({
  profile: ProfileSchema,
  job: JobMatchSchema,
  contact: ContactSchema.omit({ draftMessage: true, tone: true }).extend({
    // allow partial contact shape (draftMessage may be empty/stale, tone comes separately)
    draftMessage: z.string().optional(),
  }),
  tone: z.enum(["professional", "friendly", "direct"]),
});

// Hard product rule: generated outreach messages must never contain an em
// dash or en dash, even though the prompt already asks the model to avoid
// them. This transform is the actual enforcement: it decodes the raw byte
// stream back into text (buffering partial multi-byte UTF-8 sequences across
// chunk boundaries via TextDecoder's `stream: true` mode), swaps dashes for
// ", ", cleans up any doubled punctuation that creates, then re-encodes.
function stripDashesStream(source: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  function clean(text: string): string {
    return text
      .replace(/[—–]/g, ", ")
      .replace(/ {2,}/g, " ")
      .replace(/\s*,\s*,\s*/g, ", ")
      .replace(/\s+,/g, ",");
  }

  return source.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        if (text) {
          controller.enqueue(encoder.encode(clean(text)));
        }
      },
      flush(controller) {
        const tail = decoder.decode();
        if (tail) {
          controller.enqueue(encoder.encode(clean(tail)));
        }
      },
    })
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile, job, contact, tone } = RequestSchema.parse(body);

    const resumeHooks = [
      ...profile.skills,
      ...profile.experience.flatMap((exp) => exp.highlights),
    ];

    const prompt = `Candidate profile:
Name: ${profile.name}
Target roles: ${profile.targetRoles.join(", ")}
Skills: ${profile.skills.join(", ")}
Experience:
${profile.experience
  .map(
    (exp) =>
      `- ${exp.title} at ${exp.company} (${exp.duration}): ${exp.highlights.join("; ")}`
  )
  .join("\n")}

Job the candidate is interested in:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Why it's a fit: ${job.fitRationale}

Contact to message:
Name: ${contact.name}
Title: ${contact.title}
Company: ${contact.company}

Requested tone: ${tone}

Possible resume hooks to draw exactly one from: ${resumeHooks.join(", ")}`;

    const stream = streamComplete({ system: DRAFT_MESSAGE, prompt });

    return new NextResponse(stripDashesStream(stream), {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("draft-message error:", err);
    return NextResponse.json(
      { error: "Failed to draft the message. Please try again in a moment." },
      { status: 500 }
    );
  }
}
