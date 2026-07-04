import type { Contact } from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ContactCardProps = {
  contact: Contact;
  onDraft: (id: string) => void;
};

export function ContactCard({ contact, onDraft }: ContactCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{contact.name}</CardTitle>
        <CardDescription>
          {contact.title} at {contact.company}
        </CardDescription>
        <CardAction>
          <a
            href={contact.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            LinkedIn
          </a>
        </CardAction>
      </CardHeader>
      <CardContent />
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
