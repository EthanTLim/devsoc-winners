import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  getSupabase,
  loadSessionState,
  resetSupabaseClient,
  saveSessionState,
  type SessionState,
} from "../db";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));

type DbResult = { data: unknown; error: { message: string } | null };

function stubClient(result: DbResult) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  };
  const client = { from: vi.fn(() => chain) };
  vi.mocked(createClient).mockReturnValue(client as never);
  return { chain, client };
}

const emptyState: SessionState = { profile: null, jobs: [], contacts: [] };

describe("db", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    resetSupabaseClient();
    vi.mocked(createClient).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetSupabaseClient();
  });

  it("getSupabase returns null when credentials are not configured", () => {
    vi.stubEnv("SUPABASE_URL", "");
    resetSupabaseClient();
    expect(getSupabase()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("getSupabase memoizes a single client", () => {
    stubClient({ data: null, error: null });
    expect(getSupabase()).toBe(getSupabase());
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it("loadSessionState returns null when the database is not configured", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    resetSupabaseClient();
    expect(await loadSessionState("some-id")).toBeNull();
  });

  it("loadSessionState returns a valid stored snapshot", async () => {
    const { chain } = stubClient({ data: { state: emptyState }, error: null });
    const state = await loadSessionState("abc");
    expect(state).toEqual(emptyState);
    expect(chain.eq).toHaveBeenCalledWith("id", "abc");
  });

  it("loadSessionState returns null when the session does not exist", async () => {
    stubClient({ data: null, error: null });
    expect(await loadSessionState("missing")).toBeNull();
  });

  it("loadSessionState discards snapshots that no longer match the schemas", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubClient({ data: { state: { profile: "not-an-object" } }, error: null });
    expect(await loadSessionState("stale")).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("loadSessionState returns null and logs on a query error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    stubClient({ data: null, error: { message: "boom" } });
    expect(await loadSessionState("abc")).toBeNull();
    expect(error).toHaveBeenCalled();
  });

  it("saveSessionState creates a new session when no id is given", async () => {
    const { chain } = stubClient({ data: { id: "new-id" }, error: null });
    const id = await saveSessionState(emptyState);
    expect(id).toBe("new-id");
    expect(chain.upsert).toHaveBeenCalledWith({ state: emptyState });
  });

  it("saveSessionState upserts into the existing session row when given an id", async () => {
    const { chain } = stubClient({ data: { id: "existing" }, error: null });
    const id = await saveSessionState(emptyState, "existing");
    expect(id).toBe("existing");
    expect(chain.upsert).toHaveBeenCalledWith({ id: "existing", state: emptyState });
  });

  it("saveSessionState returns null (best-effort) on a write error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubClient({ data: null, error: { message: "boom" } });
    expect(await saveSessionState(emptyState)).toBeNull();
  });

  it("saveSessionState returns null when the database is not configured", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    resetSupabaseClient();
    expect(await saveSessionState(emptyState)).toBeNull();
  });
});
