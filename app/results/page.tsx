"use client";

import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { JobList } from "@/components/job-list";
import { PotentialJobList } from "@/components/potential-job-list";
import { ContactPanel } from "@/components/contact-panel";
import { DraftPanel } from "@/components/draft-panel";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
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

  const listedJobsCount = jobs.filter((j) => j.kind !== "potential").length;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />

      <main className="min-w-0 flex-1 px-8 py-10 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Your matches
              </h1>
              <p className="text-muted-foreground">
                Jobs that fit your background. People who can help.
              </p>
            </div>

            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => toast("Refine is coming soon")}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Refine search
            </Button>
          </header>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr_1.1fr]">
            <section aria-labelledby="jobs-heading" className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 id="jobs-heading" className="font-medium text-foreground">
                    Jobs
                  </h2>
                  <span className="rounded-full bg-muted px-2 text-xs text-muted-foreground">
                    {listedJobsCount}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => toast("Sorting is coming soon")}
                >
                  Best match
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
              <JobList jobs={jobs} />

              <div className="mt-6 border-t border-border pt-5">
                <h3 className="text-sm font-semibold text-foreground">
                  Potential jobs in your area of expertise
                </h3>
                <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
                  Unlisted firms worth a direct, cold-email approach.
                </p>
                <PotentialJobList jobs={jobs} />
              </div>
            </section>

            <section aria-labelledby="contacts-heading" className="flex min-w-0 flex-col gap-3">
              <h2 id="contacts-heading" className="font-medium text-foreground">
                Contacts
              </h2>
              <ContactPanel contacts={contacts} />
            </section>

            <section aria-labelledby="draft-heading" className="flex min-w-0 flex-col gap-3">
              <h2 id="draft-heading" className="font-medium text-foreground">
                Draft
              </h2>
              <DraftPanel contact={activeContact} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
