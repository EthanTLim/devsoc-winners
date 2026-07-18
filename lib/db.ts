import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ContactSchema, JobMatchSchema, ProfileSchema } from "./schemas";

// The ONLY file in this codebase that talks to Supabase (mirrors the llm.ts
// provider rule). Server-side only: uses the service role key, which must
// never be exposed to the client — access RLS-locked rows exclusively through
// API routes.
//
// Optional dependency: when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not
// set, every function no-ops (returns null) so local dev and CI work without
// a database, and the client falls back to sessionStorage-only state.

export const SessionStateSchema = z.object({
  profile: ProfileSchema.nullable(),
  jobs: z.array(JobMatchSchema),
  contacts: z.array(ContactSchema),
});
export type SessionState = z.infer<typeof SessionStateSchema>;

// Minimal typed view of the schema in supabase/schema.sql.
type Database = {
  public: {
    Tables: {
      sessions: {
        Row: { id: string; state: SessionState; created_at: string; updated_at: string };
        Insert: { id?: string; state: SessionState };
        Update: { id?: string; state?: SessionState };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type Client = SupabaseClient<Database>;

let cached: Client | null | undefined;

export function getSupabase(): Client | null {
  if (cached !== undefined) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return cached;
  }
  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

// Test seam: clears the memoized client so env changes take effect.
export function resetSupabaseClient(): void {
  cached = undefined;
}

/**
 * Load a persisted session's state. Returns null when the session does not
 * exist, the stored state no longer matches the current schemas, or the
 * database is not configured.
 */
export async function loadSessionState(id: string): Promise<SessionState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("sessions")
    .select("state")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[db] loadSessionState failed:", error.message);
    return null;
  }
  if (!data) return null;

  const parsed = SessionStateSchema.safeParse(data.state);
  if (!parsed.success) {
    // Schema drift (old snapshot shape): treat as no saved session rather
    // than breaking the app.
    console.warn("[db] discarding stale session state for", id);
    return null;
  }
  return parsed.data;
}

/**
 * Upsert a session's state snapshot. Pass no id to create a new session.
 * Returns the session id, or null when the database is not configured or the
 * write fails (callers treat persistence as best-effort).
 */
export async function saveSessionState(
  state: SessionState,
  id?: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const row: Database["public"]["Tables"]["sessions"]["Insert"] = id
    ? { id, state }
    : { state };
  const { data, error } = await supabase
    .from("sessions")
    .upsert(row)
    .select("id")
    .single();

  if (error) {
    console.error("[db] saveSessionState failed:", error.message);
    return null;
  }
  return data.id;
}
