"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, ExternalLink, Mail } from "lucide-react";
import type { Contact, JobMatch, OfficialContact } from "@/lib/schemas";
import { useAppState } from "@/lib/store";
import { ContactCard } from "@/components/contact-card";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_OFFICIAL_CONTACTS } from "@/lib/demo-fixtures";

// Fetches real public contacts (LinkedIn results only) for each selected job
// that doesn't have contacts yet, via /api/find-people, and renders them as
// contact cards. Never invents a person: an empty result for a company means
// a graceful "apply directly" state, not a fabricated contact.
//
// In addition, fetches the company's official channels (public careers page +
// any publicly-listed hiring email) via /api/company-contact, so the user
// also has a legitimate "apply the normal way" path alongside the real
// people found above. Never invents a page or an email either.

type ContactPanelProps = {
  contacts: Contact[];
};

type JobStatus = "idle" | "loading" | "done" | "error";
type OfficialStatus = "idle" | "loading" | "done" | "error";

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

  const [officialStatusByJobId, setOfficialStatusByJobId] = useState<
    Record<string, OfficialStatus>
  >({});
  const [officialContactByJobId, setOfficialContactByJobId] = useState<
    Record<string, OfficialContact | null>
  >({});

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

  // Same "only fetch once per job" guard pattern as above, but for the
  // company's official channels (careers page + listed hiring email). Fires
  // independently of the people search, so official info still shows up even
  // when no real person is found for a company.
  useEffect(() => {
    if (isDemo) return; // demo mode renders fixture official channels, no live fetch
    const jobsNeedingOfficial = selectedJobs.filter((job) => {
      const status = officialStatusByJobId[job.id];
      return !status || status === "idle";
    });

    if (jobsNeedingOfficial.length === 0) return;

    setOfficialStatusByJobId((prev) => {
      const next = { ...prev };
      for (const job of jobsNeedingOfficial) {
        next[job.id] = "loading";
      }
      return next;
    });

    jobsNeedingOfficial.forEach((job) => {
      fetchOfficialContactForJob(job)
        .then((officialContact) => {
          setOfficialContactByJobId((prev) => ({ ...prev, [job.id]: officialContact }));
          setOfficialStatusByJobId((prev) => ({ ...prev, [job.id]: "done" }));
        })
        .catch((err) => {
          console.error("company-contact fetch failed:", err);
          setOfficialStatusByJobId((prev) => ({ ...prev, [job.id]: "error" }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJobs, isDemo]);

  // Demo mode: render the captured fixture contacts directly, ungated by
  // selection, so the pitch replay shows the full flow with no clicks.
  if (isDemo) {
    if (contacts.length === 0) {
      return (
        <div
          className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-10"
          aria-label="No contacts"
        >
          <p className="text-sm text-muted-foreground">
            Real contacts at each company go here
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        <ContactGroups contacts={contacts} onDraft={setActiveContact} />
      </div>
    );
  }

  if (selectedJobs.length === 0) {
    return (
      <div
        className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center"
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
    <div className="flex flex-col gap-5">
      {selectedJobs.map((job) => {
        const jobContacts = contacts.filter((c) => c.jobId === job.id);
        const status = statusByJobId[job.id] ?? "idle";

        return (
          <div key={job.id} className="flex flex-col gap-3">
            <h3 className="flex items-baseline gap-1.5 text-sm font-medium text-foreground">
              People at {job.company}
              {jobContacts.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({jobContacts.length})
                </span>
              )}
            </h3>

            {jobContacts.length > 0 ? (
              <ul className="flex flex-col gap-3" aria-label={`Contacts at ${job.company}`}>
                {jobContacts.map((contact) => (
                  <li key={contact.id}>
                    <ContactCard contact={contact} onDraft={setActiveContact} />
                  </li>
                ))}
              </ul>
            ) : status === "loading" || status === "idle" ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ) : (
              // "done" with zero contacts, or "error": both resolve to the
              // same graceful, designed empty state. We never fabricate a
              // person to fill the slot.
              <div className="flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border bg-card/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No public contacts found for {job.company}, apply directly.
                </p>
              </div>
            )}

            <OfficialChannels
              job={job}
              status={officialStatusByJobId[job.id] ?? "idle"}
              officialContact={officialContactByJobId[job.id] ?? null}
            />
          </div>
        );
      })}
    </div>
  );
}

// Renders the company's official channels (public careers/jobs page + any
// publicly-listed hiring email), additive to the real people found above.
// Falls back to "Apply via company site" (the job's own real URL) when
// nothing official was found, never invents a page or an email.
function OfficialChannels({
  job,
  status,
  officialContact,
}: {
  job: JobMatch;
  status: OfficialStatus;
  officialContact: OfficialContact | null;
}) {
  if (status === "loading" || status === "idle") {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    );
  }

  const hasCareersUrl = Boolean(officialContact?.careersUrl);
  const hasEmail = Boolean(officialContact?.email);

  if (!officialContact || (!hasCareersUrl && !hasEmail)) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-4">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-primary underline-offset-4 transition-all duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.93]"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          Apply via company site
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
      <h4 className="flex items-center gap-1.5 font-medium text-foreground">
        <Building2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
        Official channels
      </h4>
      <ul className="flex flex-col gap-1.5">
        {hasCareersUrl && (
          <li>
            <a
              href={officialContact.careersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm text-primary underline-offset-4 transition-all duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.93]"
            >
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
              Careers &amp; applications
            </a>
          </li>
        )}
        {hasEmail && (
          <li>
            <a
              href={`mailto:${officialContact.email}`}
              className="inline-flex items-center gap-1.5 rounded-sm text-primary underline-offset-4 transition-all duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.93]"
            >
              <Mail className="size-3.5 shrink-0" aria-hidden="true" />
              {officialContact.email}
            </a>
          </li>
        )}
      </ul>
    </div>
  );
}

// Groups a flat contact list by company for demo mode, matching the "People
// at {company}" heading style used in the live grouped view above. Also
// renders each company's fixture "Official channels" block so the pitch
// demo shows the full feature with no live calls.
function ContactGroups({
  contacts,
  onDraft,
}: {
  contacts: Contact[];
  onDraft: (id: string) => void;
}) {
  const companies = Array.from(new Set(contacts.map((c) => c.company)));

  return (
    <>
      {companies.map((company) => {
        const companyContacts = contacts.filter((c) => c.company === company);
        const officialContact = DEMO_OFFICIAL_CONTACTS.find((oc) => oc.company === company) ?? null;
        return (
          <div key={company} className="flex flex-col gap-3">
            <h3 className="flex items-baseline gap-1.5 text-sm font-medium text-foreground">
              People at {company}
              <span className="text-xs font-normal text-muted-foreground">
                ({companyContacts.length})
              </span>
            </h3>
            <ul className="flex flex-col gap-3" aria-label={`Contacts at ${company}`}>
              {companyContacts.map((contact) => (
                <li key={contact.id}>
                  <ContactCard contact={contact} onDraft={onDraft} />
                </li>
              ))}
            </ul>

            <DemoOfficialChannels officialContact={officialContact} />
          </div>
        );
      })}
    </>
  );
}

// Demo-mode counterpart to <OfficialChannels>, rendering the fixture data
// directly (no loading state, since nothing is fetched in demo mode).
function DemoOfficialChannels({ officialContact }: { officialContact: OfficialContact | null }) {
  const hasCareersUrl = Boolean(officialContact?.careersUrl);
  const hasEmail = Boolean(officialContact?.email);

  if (!officialContact || (!hasCareersUrl && !hasEmail)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
      <h4 className="flex items-center gap-1.5 font-medium text-foreground">
        <Building2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
        Official channels
      </h4>
      <ul className="flex flex-col gap-1.5">
        {hasCareersUrl && (
          <li>
            <a
              href={officialContact.careersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm text-primary underline-offset-4 transition-all duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.93]"
            >
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
              Careers &amp; applications
            </a>
          </li>
        )}
        {hasEmail && (
          <li>
            <a
              href={`mailto:${officialContact.email}`}
              className="inline-flex items-center gap-1.5 rounded-sm text-primary underline-offset-4 transition-all duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.93]"
            >
              <Mail className="size-3.5 shrink-0" aria-hidden="true" />
              {officialContact.email}
            </a>
          </li>
        )}
      </ul>
    </div>
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

async function fetchOfficialContactForJob(job: JobMatch): Promise<OfficialContact | null> {
  const res = await fetch("/api/company-contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company: job.company, companyUrl: job.url }),
  });

  if (!res.ok) {
    throw new Error(`company-contact request failed (${res.status})`);
  }

  const data = await res.json();
  return (data.contact ?? null) as OfficialContact | null;
}
