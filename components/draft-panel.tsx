import type { Contact } from "@/lib/schemas";

// Placeholder for the real outreach draft panel. A feature agent replaces
// this with the drafted message, tone selector, and copy-to-clipboard button
// for the active contact (useAppState().activeContactId).

type DraftPanelProps = {
  contact: Contact | null;
};

export function DraftPanel({ contact }: DraftPanelProps) {
  if (!contact) {
    return (
      <div
        className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-10"
        aria-label="Draft panel placeholder"
      >
        <p className="text-sm text-muted-foreground">
          Select a contact to see a drafted message
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-2 text-sm text-muted-foreground">
        Message to {contact.name}
      </p>
      <p className="text-sm leading-relaxed">{contact.draftMessage}</p>
    </div>
  );
}
