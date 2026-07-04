"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/lib/store";
import type { Profile } from "@/lib/schemas";

const REMOTE_OPTIONS: { value: Profile["preferences"]["remote"]; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
  { value: "any", label: "Any" },
];

function toCsv(values: string[]) {
  return values.join(", ");
}

function fromCsv(input: string): string[] {
  return input
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function ProfileForm() {
  const router = useRouter();
  const profile = useAppState((state) => state.profile);
  const setProfile = useAppState((state) => state.setProfile);

  // Local text buffers for comma-separated fields so users can type
  // "a, b," without the list collapsing/reformatting mid-keystroke.
  const [targetRolesText, setTargetRolesText] = useState(() =>
    toCsv(profile?.targetRoles ?? [])
  );
  const [locationsText, setLocationsText] = useState(() =>
    toCsv(profile?.preferences.locations ?? [])
  );
  const [skillInput, setSkillInput] = useState("");

  const hasProfile = !!profile;

  const skills = useMemo(() => profile?.skills ?? [], [profile]);

  if (!profile) {
    return (
      <div
        className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-foreground">
          No profile yet
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Upload a resume first, then come back here to confirm the details.
        </p>
      </div>
    );
  }

  function patch(partial: Partial<Profile>) {
    if (!profile) return;
    setProfile({ ...profile, ...partial });
  }

  function patchPreferences(partial: Partial<Profile["preferences"]>) {
    if (!profile) return;
    setProfile({
      ...profile,
      preferences: { ...profile.preferences, ...partial },
    });
  }

  function addSkill() {
    const value = skillInput.trim();
    if (!value || !profile) return;
    if (profile.skills.includes(value)) {
      setSkillInput("");
      return;
    }
    patch({ skills: [...profile.skills, value] });
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    if (!profile) return;
    patch({ skills: profile.skills.filter((s) => s !== skill) });
  }

  return (
    <form
      className="flex flex-col gap-8"
      aria-label="Edit your profile"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            value={profile.name}
            placeholder="Your full name"
            onChange={(e) => patch({ name: e.target.value })}
            autoComplete="name"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-location">Location</Label>
          <Input
            id="profile-location"
            value={profile.location}
            placeholder="e.g. Sydney, Australia"
            onChange={(e) => patch({ location: e.target.value })}
            autoComplete="address-level2"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-target-roles">Target roles</Label>
        <Input
          id="profile-target-roles"
          value={targetRolesText}
          placeholder="e.g. Software Engineer Intern, Frontend Developer"
          onChange={(e) => {
            const text = e.target.value;
            setTargetRolesText(text);
            patch({ targetRoles: fromCsv(text) });
          }}
          aria-describedby="profile-target-roles-hint"
        />
        <p
          id="profile-target-roles-hint"
          className="text-xs text-muted-foreground"
        >
          Separate multiple roles with commas.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-skill-input">Skills</Label>
        <div
          className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-card/50 p-3"
          role="list"
          aria-label="Your skills"
        >
          {skills.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              No skills added yet.
            </span>
          ) : (
            skills.map((skill) => (
              <Badge key={skill} variant="secondary" role="listitem" className="h-6 pr-1">
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="ml-1 flex size-4 items-center justify-center rounded-full text-secondary-foreground/70 outline-none transition-colors hover:bg-secondary-foreground/10 hover:text-secondary-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label={`Remove skill ${skill}`}
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </Badge>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input
            id="profile-skill-input"
            value={skillInput}
            placeholder="Add a skill and press Enter"
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addSkill}>
            Add
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label id="profile-remote-label" htmlFor="profile-remote-tabs">
          Work preference
        </Label>
        <Tabs
          id="profile-remote-tabs"
          value={profile.preferences.remote}
          onValueChange={(value) =>
            patchPreferences({
              remote: value as Profile["preferences"]["remote"],
            })
          }
          aria-labelledby="profile-remote-label"
        >
          <TabsList aria-label="Remote work preference">
            {REMOTE_OPTIONS.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-locations">Preferred locations</Label>
        <Input
          id="profile-locations"
          value={locationsText}
          placeholder="e.g. Sydney, Melbourne, Remote"
          onChange={(e) => {
            const text = e.target.value;
            setLocationsText(text);
            patchPreferences({ locations: fromCsv(text) });
          }}
          aria-describedby="profile-locations-hint"
        />
        <p id="profile-locations-hint" className="text-xs text-muted-foreground">
          Separate multiple locations with commas.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-free-text">What I&apos;m looking for</Label>
        <Textarea
          id="profile-free-text"
          value={profile.preferences.freeText}
          placeholder="Anything else worth knowing, team size, mission, industries to avoid..."
          onChange={(e) => patchPreferences({ freeText: e.target.value })}
          rows={4}
        />
      </div>

      <Button
        type="button"
        size="lg"
        className="self-end"
        disabled={!hasProfile}
        onClick={() => router.push("/results")}
      >
        Search jobs
      </Button>
    </form>
  );
}
