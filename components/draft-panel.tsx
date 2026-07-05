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
  // Cache of already-generated drafts, keyed by `${contactId}:${tone}`, so
  // switching back to a tone shows the saved text instantly instead of asking
  // the AI to rewrite it every time.
  const cacheRef = useRef<Map<string, string>>(new Map());
  const cacheKey = (contactId: string, t: Tone) => `${contactId}:${t}`;

  const job = contact ? jobs.find((j) => j.id === contact.jobId) ?? null : null;

  const runDraft = useCallback(
    async (activeContact: Contact, activeTone: Tone, force = false) => {
      if (!profile) return;
      const activeJob = jobs.find((j) => j.id === activeContact.jobId);
      if (!activeJob) return;

      // Serve from cache when we already have this contact+tone draft, unless
      // the user explicitly asked to regenerate.
      const key = cacheKey(activeContact.id, activeTone);
      if (!force) {
        const cached = cacheRef.current.get(key);
        if (cached) {
          requestIdRef.current++; // cancel any in-flight stream
          setDraft(cached);
          setStatus("done");
          setCopied(false);
          return;
        }
      }

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

        cacheRef.current.set(key, accumulated);
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
    const initialTone = contact.tone ?? "professional";
    setTone(initialTone);
    // If this contact already has a saved draft (demo fixtures, or a message
    // generated earlier this session), show it immediately instead of asking
    // the AI to rewrite it. This is also what makes demo mode work: the store
    // has no profile in demo, so runDraft would otherwise bail and leave the
    // panel empty.
    if (contact.draftMessage) {
      requestIdRef.current++; // cancel any in-flight stream
      cacheRef.current.set(cacheKey(contact.id, initialTone), contact.draftMessage);
      setDraft(contact.draftMessage);
      setStatus("done");
      setCopied(false);
      return;
    }
    runDraft(contact, initialTone);
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

  const handleRegenerate = () => {
    if (contact) {
      runDraft(contact, tone, true); // force a fresh draft, bypass cache
    }
  };

  if (!contact) {
    return (
      <div
        className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-10"
        aria-label="Draft panel placeholder"
      >
        <p className="text-sm text-muted-foreground">
          Pick a contact to draft a message.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-2">
        <h3 className="text-[15px] font-semibold text-foreground">Draft message</h3>
        <p className="text-sm text-muted-foreground">
          To <span className="font-medium text-foreground">{contact.name}</span>
          {job ? ` · re: ${job.title}` : ""}
        </p>
      </div>

      <Tabs value={tone} onValueChange={handleToneChange}>
        <TabsList aria-label="Message tone" className="w-full rounded-full bg-muted p-1">
          {TONES.map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="flex-1 rounded-full capitalize data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:shadow-none"
            >
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

      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
        <Button
          className="w-full rounded-full"
          onClick={handleCopy}
          disabled={status !== "done" || !draft}
          aria-label="Copy draft message"
        >
          {copied ? "Copied" : "Copy message"}
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={handleRegenerate}
          disabled={status === "loading"}
          aria-label="Regenerate draft message"
        >
          Regenerate
        </Button>
      </div>
    </div>
  );
}
