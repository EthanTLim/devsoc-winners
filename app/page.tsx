import { UploadDropzone } from "@/components/upload-dropzone";

// Landing page shell: hero + one CTA + the real upload-dropzone component
// (components/upload-dropzone.tsx), wired to /api/parse-resume.

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

        {/* upload-slot */}
        <UploadDropzone />
        {/* /upload-slot */}
      </div>
    </main>
  );
}
