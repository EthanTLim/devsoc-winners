-- Inroad session persistence schema.
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
--
-- The app has no user accounts: each browser gets an anonymous session row,
-- keyed by a server-generated UUID that the client stores in localStorage.
-- All access goes through the Next.js server (service role key); RLS is
-- enabled with no public policies so the anon key can read nothing.

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  -- Snapshot of the client app state: { profile, jobs, contacts }.
  -- Stored as one jsonb document because it is written/read as a unit and
  -- its shape is owned by the zod schemas in lib/schemas.ts.
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sessions enable row level security;

-- Touch updated_at on every write so stale sessions can be pruned later.
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sessions_touch_updated_at on sessions;
create trigger sessions_touch_updated_at
  before update on sessions
  for each row execute function touch_updated_at();
