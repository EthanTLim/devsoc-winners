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

export function ContactCard({ contact, onDraft }: ContactCardProps) {
  const linkHref = contact.linkedinUrl ?? contact.source;
  const linkLabel = contact.linkedinUrl ? "LinkedIn" : contact.source ? sourceHost(contact.source) : null;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-base font-semibold leading-snug text-card-foreground">
            {contact.name}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {titleWithCompany(contact.title, contact.company)}
          </p>
        </div>

        {linkHref && linkLabel ? (
          <a
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "shrink-0 whitespace-nowrap text-xs font-medium text-primary underline-offset-4 transition-all duration-150",
              "hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "active:scale-[0.93] rounded-sm"
            )}
          >
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

      <div className="pt-1">
        <Button size="sm" variant="secondary" onClick={() => onDraft(contact.id)}>
          Draft message
        </Button>
      </div>
    </article>
  );
}
