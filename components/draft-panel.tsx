"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Contact } from "@/lib/schemas";
import { useAppState } from "@/lib/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Drafts a personalized outreach message for the active contact, streaming
// tokens progressively from /api/draft-message as they arrive, with a
// professional / friendly / direct tone selector. Persists the finished
// draft back onto the contact via useAppState().updateContact.

type DraftPanelProps = {
  contact: Contact | null;
};

type Tone = "professional" | "friendly" | "direct";
const TONES: Tone[] = ["professional", "friendly", "direct"];

export function DraftPanel({ contact }: DraftPanelProps) {
  const profile = useAppState((state) => state.profile);
  const jobs = useAppState((state) => state.jobs);
  const updateContact = useAppState((state) => state.updateContact);

  const [tone, setTone] = useState<Tone>(contact?.tone ?? "professional");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [copied, setCopied] = useState(false);

  const requestIdRef = useRef(0);

  const job = contact ? jobs.find((j) => j.id === contact.jobId) ?? null : null;

  const runDraft = useCallback(
    async (activeContact: Contact, activeTone: Tone) => {
      if (!profile) return;
      const activeJob = jobs.find((j) => j.id === activeContact.jobId);
      if (!activeJob) return;

      const requestId = ++requestIdRef.current;
      setStatus("loading");
      setDraft("");
      setCopied(false);

      try {
        const res = await fetch("/api/draft-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            job: activeJob,
            contact: activeContact,
            tone: activeTone,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`draft-message request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (requestIdRef.current !== requestId) return; // stale response, ignore
          accumulated += decoder.decode(value, { stream: true });
          setDraft(accumulated);
        }

        if (requestIdRef.current !== requestId) return;

        setStatus("done");
        updateContact(activeContact.id, { draftMessage: accumulated, tone: activeTone });
      } catch (err) {
        console.error("draft-message fetch failed:", err);
        if (requestIdRef.current === requestId) {
          setStatus("error");
        }
      }
    },
    [profile, jobs, updateContact]
  );

  useEffect(() => {
    if (!contact) return;
    setTone(contact.tone ?? "professional");
    runDraft(contact, contact.tone ?? "professional");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id]);

  const handleToneChange = (nextTone: string) => {
    const typedTone = nextTone as Tone;
    setTone(typedTone);
    if (contact) {
      runDraft(contact, typedTone);
    }
  };

  const handleCopy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      toast.success("Copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("clipboard write failed:", err);
      toast.error("Couldn't copy. Try selecting the text manually.");
    }
  };

  const handleRetry = () => {
    if (contact) {
      runDraft(contact, tone);
    }
  };

  if (!contact) {
    return (
      <div
        className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-10"
        aria-label="Draft panel placeholder"
      >
        <p className="text-sm text-muted-foreground">
          Pick a contact to draft a message.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">
          Message to {contact.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {contact.title} at {contact.company}
          {job ? ` · re: ${job.title}` : ""}
        </p>
      </div>

      <Tabs value={tone} onValueChange={handleToneChange}>
        <TabsList aria-label="Message tone">
          {TONES.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        {TONES.map((t) => (
          <TabsContent key={t} value={t}>
            {status === "loading" && draft.length === 0 ? (
              <div className="flex flex-col gap-2 pt-1" aria-live="polite" aria-busy="true">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            ) : status === "error" ? (
              <div className="flex flex-col items-start gap-2 pt-1">
                <p className="text-sm text-muted-foreground">
                  Could not draft this message. Please try again.
                </p>
                <Button size="sm" variant="outline" onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            ) : (
              <p
                className="whitespace-pre-wrap pt-1 text-sm leading-relaxed text-foreground transition-opacity duration-300 ease-out"
                aria-live="polite"
              >
                {draft}
              </p>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex items-center justify-end border-t border-border pt-3">
        <Button
          size="sm"
          variant={copied ? "secondary" : "outline"}
          onClick={handleCopy}
          disabled={status !== "done" || !draft}
          aria-label="Copy draft message"
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
