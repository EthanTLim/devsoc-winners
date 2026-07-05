"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Briefcase,
  Users,
  Send,
  Paperclip,
} from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { UploadDropzone } from "@/components/upload-dropzone";

const EASE = [0.16, 1, 0.3, 1] as const;

const FEATURES = [
  {
    n: "01",
    title: "Live job matches",
    body: "Real, current postings that fit your background, each with why it fits you.",
    icon: Briefcase,
  },
  {
    n: "02",
    title: "The real humans",
    body: "The recruiters and hiring leads behind the roles, from public search only. Never invented.",
    icon: Users,
  },
  {
    n: "03",
    title: "The message that lands",
    body: "A short, personal outreach draft you can copy and send in one click.",
    icon: Send,
  },
];

function scrollToUpload() {
  document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth" });
}

function scrollToHowItWorks() {
  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
}

const STEPS = [
  "Find the right role",
  "Get introduced",
  "Start the conversation",
];

export default function Home() {
  return (
    <main className="flex flex-col bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <nav
          aria-label="Primary"
          className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4"
        >
          <a
            href="#top"
            className="rounded-sm font-serif text-2xl font-semibold lowercase tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            inroad<span className="text-primary">.</span>
          </a>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={scrollToHowItWorks}
              className="rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={scrollToUpload}
              className="rounded-full border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground outline-none transition-colors hover:border-foreground/40 hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Get started, scrolls to the resume upload"
            >
              Get started
            </button>
          </div>
        </nav>
      </header>

      {/* 1. Hero */}
      <section
        id="top"
        className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 sm:py-24 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-32"
      >
        <div className="flex flex-col items-start text-left">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="font-serif text-6xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-7xl"
          >
            Better matches.
            <br />
            Real <span className="text-primary">introductions.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
            className="mt-6 flex flex-col gap-1"
          >
            <p className="text-lg text-muted-foreground sm:text-xl">
              From resume to a real inbox.
            </p>
            <p className="text-base text-muted-foreground/80 sm:text-lg">
              The jobs, the people, and the words to reach them.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.9 }}
            className="mt-10"
          >
            <button
              type="button"
              onClick={scrollToUpload}
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-medium text-primary-foreground outline-none transition-transform duration-300 ease-out hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Get started
              <ArrowRight
                className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
                aria-hidden="true"
              />
            </button>
          </motion.div>
        </div>

        <div className="relative flex items-center justify-center py-8 lg:py-0">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(closest-side,oklch(0.93_0.028_158/0.6),transparent)]"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.4 }}
            className="relative w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-xl"
          >
            <Paperclip
              className="absolute -top-4 left-8 size-8 -rotate-45 text-muted-foreground/70"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <ol className="flex flex-col gap-5 font-serif text-lg text-card-foreground">
              {STEPS.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="text-primary">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </motion.div>
        </div>
      </section>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE, delay: 1.3 }}
        className="mx-auto flex -translate-y-4 flex-col items-center gap-2 pb-8"
      >
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Scroll to explore
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
        </motion.div>
      </motion.div>

      {/* 2. Story / waterfall reveal */}
      <section
        id="how-it-works"
        className="mx-auto flex w-full max-w-4xl flex-col px-6 py-40 sm:py-56"
      >
        <div className="flex flex-col gap-6 sm:gap-8">
          <FadeIn delay={0}>
            <p className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              You have the resume.
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              You&apos;re missing the person who actually reads it.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <p className="text-3xl font-semibold tracking-tight text-primary sm:text-5xl">
              Inroad finds both.
            </p>
          </FadeIn>
        </div>

        <div className="mt-40 flex flex-col gap-24 sm:mt-56 sm:gap-32">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <FadeIn key={feature.title} delay={i * 0.15}>
                <div className="flex flex-col gap-3 text-left sm:max-w-xl">
                  <div className="flex items-center gap-3">
                    <Icon
                      className="size-6 text-foreground"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium tracking-wide text-primary">
                      {feature.n}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {feature.title}
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {feature.body}
                  </p>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* 3. Get started */}
      <section
        id="get-started"
        className="flex min-h-[80vh] flex-col items-center justify-center gap-12 px-6 py-24"
      >
        <FadeIn className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Ready when you are.
          </h2>
          <p className="max-w-md text-base text-muted-foreground sm:text-lg">
            Drop your resume. We will take it from here.
          </p>
        </FadeIn>

        <FadeIn delay={0.15} className="w-full max-w-xl">
          <UploadDropzone />
        </FadeIn>
      </section>
    </main>
  );
}
