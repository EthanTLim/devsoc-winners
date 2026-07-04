"use client";

import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, Briefcase, Users, Send } from "lucide-react";
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

export default function Home() {
  return (
    <main className="flex flex-col bg-background">
      {/* 1. Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="text-7xl font-bold lowercase tracking-tight text-foreground sm:text-8xl"
          >
            inroad.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
            className="mt-6 flex flex-col items-center gap-1"
          >
            <p className="text-lg text-muted-foreground sm:text-xl">
              From resume to a real inbox.
            </p>
            <p className="text-base text-muted-foreground/80 sm:text-lg">
              The jobs, the people, and the words to reach them.
            </p>
          </motion.div>

          <motion.button
            type="button"
            onClick={scrollToUpload}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.9 }}
            className="group mt-12 inline-flex items-center gap-2 text-base font-medium text-foreground outline-none"
          >
            <span className="relative">
              Get Started Now
              <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-foreground transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100" />
            </span>
            <ArrowRight
              className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
              aria-hidden="true"
            />
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 1.3 }}
          className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
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
      </section>

      {/* 2. Story / waterfall reveal */}
      <section className="mx-auto flex w-full max-w-4xl flex-col px-6 py-40 sm:py-56">
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
