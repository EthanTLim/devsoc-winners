import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Landing page shell: hero + one CTA + a placeholder slot for the real
// upload-dropzone component, which a feature agent builds separately
// (components/upload-dropzone.tsx). Kept intentionally bare.

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary">
          Accessibility hackathon build
        </span>

        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          From resume to a real inbox.
        </h1>

        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          Upload your resume. Inroad finds live job matches, the real people
          behind them, and drafts the message that gets you in the door.
        </p>

        {/* Upload dropzone slot — a feature agent replaces this with
            components/upload-dropzone.tsx wired to /api/parse-resume. */}
        <div
          className="flex w-full flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-10"
          aria-label="Resume upload area placeholder"
        >
          <p className="text-sm text-muted-foreground">
            Upload dropzone goes here
          </p>
          <Link
            href="/review"
            className={cn(buttonVariants({ size: "lg" }), "px-6")}
          >
            Upload your resume
          </Link>
        </div>
      </div>
    </main>
  );
}
