import type { Contact } from "@/lib/schemas";

// Placeholder for the real contact panel. A feature agent replaces this
// with contact cards (name, title, company, LinkedIn link) per selected job.

type ContactPanelProps = {
  contacts: Contact[];
};

export function ContactPanel({ contacts }: ContactPanelProps) {
  if (contacts.length === 0) {
    return (
      <div
        className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-10"
        aria-label="Contact panel placeholder"
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
        <li key={contact.id} className="rounded-xl border border-border bg-card p-4">
          <p className="font-medium">{contact.name}</p>
          <p className="text-sm text-muted-foreground">
            {contact.title} at {contact.company}
          </p>
        </li>
      ))}
    </ul>
  );
}
