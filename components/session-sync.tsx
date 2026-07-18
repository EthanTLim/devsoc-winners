"use client";

import { useEffect, useRef } from "react";
import { useAppState } from "@/lib/store";

const SESSION_ID_KEY = "inroad-session-id";
const SAVE_DEBOUNCE_MS = 1500;

// Bridges the client store to the Supabase-backed /api/session endpoint so a
// session survives browser restarts (sessionStorage alone does not).
// Best-effort by design: if persistence is unconfigured (503) or errors, the
// app keeps working on local state alone.
export function SessionSync() {
  const disabled = useRef(false);

  // Restore once on mount: only into an empty store, so mid-session state
  // (already hydrated from sessionStorage) is never clobbered.
  useEffect(() => {
    const id = localStorage.getItem(SESSION_ID_KEY);
    if (!id) return;

    (async () => {
      try {
        const res = await fetch(`/api/session?id=${encodeURIComponent(id)}`);
        if (res.status === 503) {
          disabled.current = true;
          return;
        }
        if (!res.ok) return;
        const { state } = await res.json();
        if (!state) return;

        const store = useAppState.getState();
        if (store.profile === null && store.jobs.length === 0) {
          store.setProfile(state.profile);
          store.setJobs(state.jobs);
          store.setContacts(state.contacts);
        }
      } catch {
        // Offline or server down: stay on local state.
      }
    })();
  }, []);

  // Save on change, debounced.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = useAppState.subscribe((state) => {
      if (disabled.current) return;
      if (state.profile === null && state.jobs.length === 0) return;

      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const res = await fetch("/api/session", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: localStorage.getItem(SESSION_ID_KEY) ?? undefined,
              state: {
                profile: state.profile,
                jobs: state.jobs,
                contacts: state.contacts,
              },
            }),
          });
          if (res.status === 503) {
            disabled.current = true;
            return;
          }
          if (!res.ok) return;
          const { id } = await res.json();
          if (typeof id === "string") {
            localStorage.setItem(SESSION_ID_KEY, id);
          }
        } catch {
          // Best-effort: drop this save, try again on the next change.
        }
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return null;
}
