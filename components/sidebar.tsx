"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, User } from "lucide-react";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/schemas";

// Left app-shell sidebar for the results/matches experience. Purely
// presentational chrome: nav links point at routes that may not all exist yet
// (Profile/Settings are placeholders), the active state is derived from the
// current pathname so it stays correct without extra wiring.

const NAV_ITEMS = [
  { href: "/results", label: "Matches", icon: LayoutGrid },
  { href: "/review", label: "Profile", icon: User },
] as const;

function initialsFromName(name: string | undefined): string {
  if (!name) return "IN";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "IN";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Real (not fake) profile strength: percentage of the fields that actually
// drive matching/outreach quality that are filled in. Weighted toward the
// fields that matter most to the pipeline rather than counting every key
// equally.
function profileStrength(profile: Profile | null): number {
  if (!profile) return 0;
  const checks = [
    Boolean(profile.name),
    Boolean(profile.location),
    profile.targetRoles.length > 0,
    profile.skills.length > 0,
    profile.experience.length > 0,
    profile.education.length > 0,
    profile.preferences.locations.length > 0 || profile.preferences.remote !== "any",
    Boolean(profile.preferences.freeText),
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

function strengthLabel(pct: number): string {
  if (pct >= 80) return "Strong";
  if (pct >= 50) return "Good";
  if (pct > 0) return "Getting there";
  return "Not started";
}

export function Sidebar() {
  const pathname = usePathname();
  const profile = useAppState((s) => s.profile);

  const displayName = profile?.name ?? "Your profile";
  const initials = initialsFromName(profile?.name);
  const strength = profileStrength(profile);

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col self-start border-r border-border bg-sidebar px-4 py-6">
      <div className="px-2">
        <span className="font-serif text-2xl tracking-tight text-foreground">
          inroad<span className="text-primary">.</span>
        </span>
      </div>

      <nav aria-label="Primary" className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5 px-2">
          <span className="text-xs text-muted-foreground">Profile strength</span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-foreground">{strengthLabel(strength)}</span>
            <span className="text-xs text-muted-foreground">{strength}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={strength}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile strength"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${strength}%` }}
            />
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Keep refining your profile to improve match quality.
          </p>
          <Link
            href="/review"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View profile
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        <div className="border-t border-border" />

        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            {initials}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {displayName}
          </span>
        </div>
      </div>
    </aside>
  );
}
