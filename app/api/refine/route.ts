import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeJson } from "@/lib/llm";
import { REFINE } from "@/lib/prompts";
import { ProfileSchema, RefineDeltaSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const RequestSchema = z.object({
  profile: ProfileSchema,
  instruction: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile, instruction } = RequestSchema.parse(body);

    const prompt = `Candidate's current profile/preferences:
Target roles: ${profile.targetRoles.join(", ")}
Location: ${profile.location}
Remote preference: ${profile.preferences.remote}
Location preference(s): ${profile.preferences.locations.join(", ") || "none set"}
Free text preferences: ${profile.preferences.freeText || "none"}

User's free-text refinement instruction: "${instruction}"`;

    const delta = await completeJson({
      system: REFINE,
      prompt,
      schema: RefineDeltaSchema,
    });

    return NextResponse.json({ delta });
  } catch (err) {
    console.error("refine error:", err);
    return NextResponse.json(
      { error: "Couldn't apply that refinement. Please try again." },
      { status: 500 }
    );
  }
}
