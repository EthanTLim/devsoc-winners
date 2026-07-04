import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { completeJson } from "@/lib/llm";
import { ProfileSchema } from "@/lib/schemas";
import { PARSE_RESUME } from "@/lib/prompts";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const MIN_EXTRACTED_TEXT_LENGTH = 30;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file was provided. Please upload a resume PDF." },
        { status: 400 }
      );
    }

    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported. Please upload a .pdf resume." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "That file is too large. Please upload a resume under 5MB." },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    let extractedText: string;
    try {
      const pdf = await getDocumentProxy(buffer);
      const { text } = await extractText(pdf, { mergePages: true });
      extractedText = (text || "").trim();
    } catch (err) {
      console.error("parse-resume: failed to extract PDF text", err);
      return NextResponse.json(
        {
          error:
            "We couldn't read that PDF. Please make sure it's a valid, text-based PDF and try again.",
        },
        { status: 422 }
      );
    }

    if (extractedText.length < MIN_EXTRACTED_TEXT_LENGTH) {
      return NextResponse.json(
        {
          error:
            "This looks like a scanned image PDF, please upload a text-based PDF.",
        },
        { status: 422 }
      );
    }

    const profile = await completeJson({
      system: PARSE_RESUME,
      prompt: `Resume text extracted from the uploaded PDF:\n\n${extractedText}`,
      schema: ProfileSchema,
    });

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("parse-resume: unexpected failure", err);
    return NextResponse.json(
      { error: "Something went wrong while parsing your resume. Please try again." },
      { status: 500 }
    );
  }
}
