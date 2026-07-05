import { Building2, Mail, Phone, MapPin, BadgeCheck } from "lucide-react";
import type { CompanyContact } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type CompanyContactCardProps = {
  contact: CompanyContact;
};

// Renders the company's GENERAL contact info (as opposed to a named person)
// above the people list for a saved company. Every field is either real data
// found verbatim in a public search result, or an honest muted "not found"
// state, never a fabricated value.
export function CompanyContactCard({ contact }: CompanyContactCardProps) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-[15px] font-semibold leading-snug text-card-foreground">
          Company contact
        </h3>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {contact.email ? (
            <a
              href={`mailto:${contact.email}`}
              className={cn(
                "truncate text-muted-foreground underline-offset-4 transition-colors",
                "hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
              )}
            >
              {contact.email}
            </a>
          ) : (
            <span className="text-muted-foreground">Company email not confidently found</span>
          )}
          {contact.email && contact.emailVerified ? (
            <span title="Domain accepts mail (MX verified)" className="shrink-0">
              <BadgeCheck className="size-3.5 text-primary" aria-hidden="true" />
              <span className="sr-only">verified</span>
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Phone className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {contact.phone ? (
            <a
              href={`tel:${contact.phone}`}
              className={cn(
                "truncate text-muted-foreground underline-offset-4 transition-colors",
                "hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
              )}
            >
              {contact.phone}
            </a>
          ) : (
            <span className="text-muted-foreground">Office phone not confidently found</span>
          )}
          {contact.phone && contact.phoneVerified ? (
            <span title="Valid phone format" className="shrink-0">
              <BadgeCheck className="size-3.5 text-primary" aria-hidden="true" />
              <span className="sr-only">verified</span>
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          {contact.address ? (
            <span className="truncate text-muted-foreground">{contact.address}</span>
          ) : (
            <span className="text-muted-foreground">Office location not confidently found</span>
          )}
        </div>
      </div>

      {contact.note ? (
        <p className="text-xs text-muted-foreground">{contact.note}</p>
      ) : null}
    </article>
  );
}
