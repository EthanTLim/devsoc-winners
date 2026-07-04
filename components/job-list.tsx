import type { JobMatch } from "@/lib/schemas";

// Placeholder for the real job results list. A feature agent replaces this
// with streaming job cards (title, company, location, link, fitRationale).

type JobListProps = {
  jobs: JobMatch[];
};

export function JobList({ jobs }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div
        className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-10"
        aria-label="Job list placeholder"
      >
        <p className="text-sm text-muted-foreground">Job matches go here</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3" aria-label="Job matches">
      {jobs.map((job) => (
        <li key={job.id} className="rounded-xl border border-border bg-card p-4">
          <p className="font-medium">{job.title}</p>
          <p className="text-sm text-muted-foreground">
            {job.company} &middot; {job.location}
          </p>
        </li>
      ))}
    </ul>
  );
}
