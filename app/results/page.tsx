"use client";

import { useSearchParams } from "next/navigation";
import { JobList } from "@/components/job-list";
import { PotentialJobList } from "@/components/potential-job-list";
import { ContactPanel } from "@/components/contact-panel";
import { DraftPanel } from "@/components/draft-panel";
import { DEMO } from "@/lib/demo-fixtures";
import { useAppState } from "@/lib/store";

// Results page shell: jobs, contacts, drafts, refine chat. This file's
// import structure is frozen — feature agents fill in real search/refine
// wiring inside JobList/ContactPanel/DraftPanel and the useAppState store,
// not by changing what this page imports.

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";

  const storeJobs = useAppState((state) => state.jobs);
  const storeContacts = useAppState((state) => state.contacts);
  const activeContactId = useAppState((state) => state.activeContactId);

  const jobs = isDemo ? DEMO.jobs : storeJobs;
  const contacts = isDemo ? DEMO.contacts : storeContacts;
  const activeContact =
    contacts.find((c) => c.id === activeContactId) ?? contacts[0] ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Your matches
        </h1>
        <p className="text-sm text-muted-foreground">
          Jobs, real people, and drafted outreach, all in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section aria-labelledby="jobs-heading" className="lg:col-span-1">
          <h2 id="jobs-heading" className="mb-3 text-sm font-medium text-muted-foreground">
            Publicly listed jobs
          </h2>
          <JobList jobs={jobs} />

          <div aria-labelledby="potential-jobs-heading">
            <h2
              id="potential-jobs-heading"
              className="mb-3 mt-8 text-sm font-medium text-muted-foreground"
            >
              Potential jobs in your area of expertise
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Unlisted firms we think are worth a direct, cold-email approach.
            </p>
            <PotentialJobList jobs={jobs} />
          </div>
        </section>

        <section aria-labelledby="contacts-heading" className="lg:col-span-1">
          <h2 id="contacts-heading" className="mb-3 text-sm font-medium text-muted-foreground">
            Contacts
          </h2>
          <ContactPanel contacts={contacts} />
        </section>

        <section aria-labelledby="draft-heading" className="lg:col-span-1">
          <h2 id="draft-heading" className="mb-3 text-sm font-medium text-muted-foreground">
            Draft
          </h2>
          <DraftPanel contact={activeContact} />
        </section>
      </div>

      {/* Refine chat slot — a feature agent replaces this with
          components/refine-bar.tsx wired to /api/refine. */}
      <div
        className="rounded-xl border border-dashed border-border bg-card/50 p-6"
        aria-label="Refine chat placeholder"
      >
        <p className="text-sm text-muted-foreground">
          Refine chat goes here
        </p>
      </div>
    </main>
  );
}
