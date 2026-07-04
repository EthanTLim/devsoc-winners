"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, User, Settings, ChevronsUpDown } from "lucide-react";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";

// Left app-shell sidebar for the results/matches experience. Purely
// presentational chrome: nav links point at routes that may not all exist yet
// (Profile/Settings are placeholders), the active state is derived from the
// current pathname so it stays correct without extra wiring.

const NAV_ITEMS = [
  { href: "/results", label: "Matches", icon: LayoutGrid },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function initialsFromName(name: string | undefined): string {
  if (!name) return "IN";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "IN";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const profile = useAppState((s) => s.profile);

  const displayName = profile?.name ?? "Your profile";
  const initials = initialsFromName(profile?.name);

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col self-start border-r border-border bg-sidebar px-4 py-6">
      <div className="px-2">
        <span className="text-xl font-bold tracking-tight text-foreground">
          inroad.
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
            <span className="text-sm font-bold text-foreground">Strong</span>
            <span className="text-xs text-muted-foreground">82%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: "82%" }}
            />
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Keep refining your profile to improve match quality.
          </p>
          <Link
            href="/profile"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View profile
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        <div className="border-t border-border" />

        <button
          type="button"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {displayName}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
