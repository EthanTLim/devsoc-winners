import type { Contact } from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

export function ContactCard({ contact, onDraft }: ContactCardProps) {
  const linkClass =
    "text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{contact.name}</CardTitle>
        <CardDescription>
          {contact.title} at {contact.company}
        </CardDescription>
        <CardAction>
          {contact.linkedinUrl ? (
            <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
              LinkedIn
            </a>
          ) : contact.source ? (
            <a href={contact.source} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {sourceHost(contact.source)}
            </a>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent>
        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {contact.email}
          </a>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onDraft(contact.id)}
        >
          Draft message
        </Button>
      </CardFooter>
    </Card>
  );
}
