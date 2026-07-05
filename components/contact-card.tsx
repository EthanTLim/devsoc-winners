import { Link2 } from "lucide-react";
import type { Contact } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ContactCardProps = {
  contact: Contact;
  onDraft: (id: string) => void;
};

// Prefer a LinkedIn link when we have one. Otherwise (contact found via
// general web search) link to the public source page the person was found on.
function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

// The title we get back from search often already mentions the company
// (e.g. "Talent Acquisition Manager at Displayr"). Only append "at {company}"
// when it isn't already there, so we don't render it twice.
function titleWithCompany(title: string, company: string): string {
  if (!company || title.toLowerCase().includes(company.toLowerCase())) {
    return title;
  }
  return `${title} at ${company}`;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function ContactCard({ contact, onDraft }: ContactCardProps) {
  const linkHref = contact.linkedinUrl ?? contact.source;
  const isLinkedIn = Boolean(contact.linkedinUrl);
  const linkLabel = isLinkedIn ? "LinkedIn" : contact.source ? sourceHost(contact.source) : null;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            {initialsFromName(contact.name)}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="truncate text-[15px] font-semibold leading-snug text-card-foreground">
              {contact.name}
            </h3>
            <p className="truncate text-sm leading-relaxed text-muted-foreground">
              {titleWithCompany(contact.title, contact.company)}
            </p>
          </div>
        </div>

        {linkHref && linkLabel ? (
          <a
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${contact.name} on ${linkLabel}`}
            className={cn(
              "flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-primary underline-offset-4 transition-all duration-150",
              "hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "active:scale-[0.93] rounded-sm"
            )}
          >
            {isLinkedIn && <Link2 className="size-3.5" aria-hidden="true" />}
            {linkLabel}
          </a>
        ) : null}
      </div>

      {contact.email ? (
        <a
          href={`mailto:${contact.email}`}
          className={cn(
            "text-xs text-muted-foreground underline-offset-4 transition-colors",
            "hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
          )}
        >
          {contact.email}
        </a>
      ) : null}

      <div className="flex items-center gap-3 pt-1">
        <Button size="sm" variant="secondary" onClick={() => onDraft(contact.id)}>
          Draft message
        </Button>
        {linkHref ? (
          <a
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary hover:underline"
          >
            View profile
          </a>
        ) : null}
      </div>
    </article>
  );
}
