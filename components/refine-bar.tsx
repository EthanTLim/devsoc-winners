"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SendHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store";
import type { RefineDelta } from "@/lib/schemas";

// Free-text "refine search" bar (CLAUDE.md pipeline #5). The user types a
// steering instruction ("only remote", "more senior roles", "focus on
// fintech"). We send it + the current profile to /api/refine, merge the
// returned delta into the store profile, then bump searchNonce so JobList /
// PotentialJobList clear and re-run their search against the updated profile.

type RefineBarProps = {
  onApplied?: () => void;
};

export function RefineBar({ onApplied }: RefineBarProps) {
  const profile = useAppState((s) => s.profile);
  const setProfile = useAppState((s) => s.setProfile);
  const bumpSearch = useAppState((s) => s.bumpSearch);

  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);

  function applyDelta(delta: RefineDelta) {
    if (!profile) return;

    const nextPreferences = { ...profile.preferences };
    if (delta.locations) nextPreferences.locations = delta.locations;
    if (delta.remote) nextPreferences.remote = delta.remote;

    let nextTargetRoles = profile.targetRoles;
    if (delta.roleShift) {
      nextTargetRoles = [delta.roleShift, ...profile.targetRoles.filter((r) => r !== delta.roleShift)];
    }

    // messageEdit isn't wired into draft regeneration yet, but we keep it on
    // preferences.freeText so it's at least visible/available downstream
    // rather than silently dropped.
    const nextFreeText = delta.messageEdit
      ? [profile.preferences.freeText, delta.messageEdit].filter(Boolean).join(". ")
      : nextPreferences.freeText;

    setProfile({
      ...profile,
      targetRoles: nextTargetRoles,
      preferences: { ...nextPreferences, freeText: nextFreeText },
    });

    bumpSearch();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = instruction.trim();
    if (!trimmed || !profile || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, instruction: trimmed }),
      });

      if (!res.ok) {
        throw new Error(`Refine failed (${res.status})`);
      }

      const data = await res.json();
      const delta = data.delta as RefineDelta;

      if (!delta || Object.keys(delta).length === 0) {
        toast("Couldn't tell what to change from that. Try being more specific.");
        return;
      }

      applyDelta(delta);
      setInstruction("");
      toast.success("Search updated");
      onApplied?.();
    } catch (err) {
      console.error("[refine-bar] refine failed:", err);
      toast.error("Couldn't apply that refinement. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 pl-4 shadow-sm"
      aria-label="Refine search"
    >
      <Input
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder='Try "only remote roles" or "focus on fintech"'
        aria-label="Refinement instruction"
        disabled={loading || !profile}
        className="h-8 flex-1 border-none bg-transparent p-0 shadow-none focus-visible:ring-0"
      />
      <Button
        type="submit"
        size="sm"
        className="shrink-0 rounded-full"
        disabled={loading || !profile || !instruction.trim()}
        aria-label="Apply refinement"
      >
        {loading ? "Updating..." : "Apply"}
        {!loading && <SendHorizontal className="size-3.5" aria-hidden="true" />}
      </Button>
    </form>
  );
}
