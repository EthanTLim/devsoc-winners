"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Contact, JobMatch } from "@/lib/schemas";
import { useAppState } from "@/lib/store";
import { ContactCard } from "@/components/contact-card";
import { Skeleton } from "@/components/ui/skeleton";

// Fetches real public contacts (LinkedIn results only) for each selected job
// that doesn't have contacts yet, via /api/find-people, and renders them as
// contact cards. Never invents a person: an empty result for a company means
// a graceful "apply directly" state, not a fabricated contact.

type ContactPanelProps = {
  contacts: Contact[];
};

type JobStatus = "idle" | "loading" | "done" | "error";

export function ContactPanel({ contacts }: ContactPanelProps) {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";

  const allJobs = useAppState((state) => state.jobs);
  const selectedJobIds = useAppState((state) => state.selectedJobIds);
  const addContact = useAppState((state) => state.addContact);
  const setActiveContact = useAppState((state) => state.setActiveContact);

  // Only look for people at the jobs the user has actually starred. This keeps
  // the people search intentional (and avoids firing Exa/LLM calls at every
  // job the moment results stream in).
  const selectedJobs = allJobs.filter((job) => selectedJobIds.includes(job.id));

  const [statusByJobId, setStatusByJobId] = useState<Record<string, JobStatus>>({});

  useEffect(() => {
    if (isDemo) return; // demo mode renders fixture contacts, no live fetch
    const jobsNeedingContacts = selectedJobs.filter((job) => {
      const hasContacts = contacts.some((c) => c.jobId === job.id);
      const status = statusByJobId[job.id];
      return !hasContacts && (!status || status === "idle");
    });

    if (jobsNeedingContacts.length === 0) return;

    setStatusByJobId((prev) => {
      const next = { ...prev };
      for (const job of jobsNeedingContacts) {
        next[job.id] = "loading";
      }
      return next;
    });

    jobsNeedingContacts.forEach((job) => {
      fetchContactsForJob(job)
        .then((fetchedContacts) => {
          fetchedContacts.forEach((contact) => addContact(contact));
          setStatusByJobId((prev) => ({ ...prev, [job.id]: "done" }));
        })
        .catch((err) => {
          console.error("find-people fetch failed:", err);
          setStatusByJobId((prev) => ({ ...prev, [job.id]: "error" }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJobs, contacts, isDemo]);

  // Demo mode: render the captured fixture contacts directly, ungated by
  // selection, so the pitch replay shows the full flow with no clicks.
  if (isDemo) {
    if (contacts.length === 0) {
      return (
        <div
          className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-10"
          aria-label="No contacts"
        >
          <p className="text-sm text-muted-foreground">
            Real contacts at each company go here
          </p>
        </div>
      );
    }
    return (
      <ul className="flex flex-col gap-3" aria-label="Contacts">
        {contacts.map((contact) => (
          <li key={contact.id}>
            <ContactCard contact={contact} onDraft={setActiveContact} />
          </li>
        ))}
      </ul>
    );
  }

  if (selectedJobs.length === 0) {
    return (
      <div
        className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-10 text-center"
        aria-label="No jobs starred yet"
      >
        <p className="text-sm text-muted-foreground">
          {allJobs.length === 0
            ? "Real contacts at each company go here"
            : "Star a job to find real people at that company"}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3" aria-label="Contacts">
      {selectedJobs.map((job) => {
        const jobContacts = contacts.filter((c) => c.jobId === job.id);
        const status = statusByJobId[job.id] ?? "idle";

        if (jobContacts.length > 0) {
          return jobContacts.map((contact) => (
            <li key={contact.id}>
              <ContactCard contact={contact} onDraft={setActiveContact} />
            </li>
          ));
        }

        if (status === "loading" || status === "idle") {
          return (
            <li key={job.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
              <Skeleton className="h-3 w-1/3" />
            </li>
          );
        }

        // "done" with zero contacts, or "error": both resolve to the same
        // graceful, designed empty state. We never fabricate a person to
        // fill the slot.
        return (
          <li
            key={job.id}
            className="flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-card/50 p-4 text-center"
          >
            <p className="text-sm text-muted-foreground">
              No public contacts found for {job.company}, apply directly.
            </p>
          </li>
        );
      })}
    </ul>
  );
}

async function fetchContactsForJob(job: JobMatch): Promise<Contact[]> {
  const res = await fetch("/api/find-people", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job }),
  });

  if (!res.ok) {
    throw new Error(`find-people request failed (${res.status})`);
  }

  const data = await res.json();
  return (data.contacts ?? []) as Contact[];
}
