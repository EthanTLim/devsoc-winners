"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { UploadDropzone } from "@/components/upload-dropzone";

function TopNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-20 flex items-center px-6 py-6 sm:px-10 sm:py-8">
      <span className="font-serif text-2xl tracking-tight text-foreground sm:text-3xl">
        inroad<span className="text-primary">.</span>
      </span>
    </header>
  );
}

/** Full-bleed desk photo. Subjects live in the right third; the left is open cream for text. */
function DeskBackground() {
  return (
    <div className="absolute inset-0 z-0">
      <Image
        src="/desk.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-right"
      />
      {/* Light left-to-right scrim so text over the open left area stays crisp. */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/40 to-transparent" />
    </div>
  );
}

export default function Home() {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <DeskBackground />
      <TopNav />

      {showUpload ? (
        <section
          id="get-started"
          className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6"
        >
          <div className="flex w-full max-w-xl flex-col items-center text-center">
            <h1 className="font-serif no-ligatures text-4xl tracking-tight text-foreground sm:text-6xl">
              Let&apos;s find the right opportunities.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Upload your resume and we&apos;ll take it from here.
            </p>

            <div className="mt-10 w-full">
              <UploadDropzone />
            </div>

            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4 text-primary" aria-hidden="true" />
              Secure. Private. Only you control your data.
            </p>
          </div>
        </section>
      ) : (
        <section className="relative z-10 flex min-h-screen flex-col justify-center px-6 sm:px-10 lg:px-16">
          <div className="max-w-2xl">
            <h1 className="font-serif no-ligatures text-5xl leading-[1.05] tracking-tight text-foreground sm:text-7xl">
              Better matches.
              <br />
              Real introductions.
            </h1>

            <p className="mt-8 max-w-md text-lg leading-relaxed text-muted-foreground sm:text-xl">
              inroad helps you find roles that fit your background and reach the right
              people, without the guesswork.
            </p>

            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="group mt-12 inline-flex items-center gap-3 rounded-xl bg-primary px-7 py-4 text-base font-medium text-primary-foreground outline-none transition-colors duration-150 hover:bg-primary/90 active:bg-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Get started
              <ArrowRight
                className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
                aria-hidden="true"
              />
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
