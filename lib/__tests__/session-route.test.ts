import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/session/route";
import * as db from "@/lib/db";
import type { SessionState } from "@/lib/db";

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    getSupabase: vi.fn(),
    loadSessionState: vi.fn(),
    saveSessionState: vi.fn(),
  };
});

const getSupabaseMock = vi.mocked(db.getSupabase);
const loadMock = vi.mocked(db.loadSessionState);
const saveMock = vi.mocked(db.saveSessionState);

const state: SessionState = { profile: null, jobs: [], contacts: [] };

function getReq(id?: string) {
  const url = id
    ? `http://localhost/api/session?id=${id}`
    : "http://localhost/api/session";
  return new NextRequest(url);
}

function putReq(body: unknown) {
  return new NextRequest("http://localhost/api/session", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("/api/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseMock.mockReturnValue({} as never);
  });

  it("GET responds 503 when persistence is not configured", async () => {
    getSupabaseMock.mockReturnValue(null);
    const res = await GET(getReq("abc"));
    expect(res.status).toBe(503);
  });

  it("GET responds 400 without a session id", async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(400);
  });

  it("GET returns the stored state", async () => {
    loadMock.mockResolvedValue(state);
    const res = await GET(getReq("abc"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ state });
    expect(loadMock).toHaveBeenCalledWith("abc");
  });

  it("GET returns a null state for an unknown session", async () => {
    loadMock.mockResolvedValue(null);
    const res = await GET(getReq("missing"));
    expect(await res.json()).toEqual({ state: null });
  });

  it("PUT responds 503 when persistence is not configured", async () => {
    getSupabaseMock.mockReturnValue(null);
    const res = await PUT(putReq({ state }));
    expect(res.status).toBe(503);
  });

  it("PUT rejects an invalid state payload", async () => {
    const res = await PUT(putReq({ state: { profile: 42 } }));
    expect(res.status).toBe(400);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("PUT saves and returns the session id", async () => {
    saveMock.mockResolvedValue("session-1");
    const res = await PUT(putReq({ id: "session-1", state }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "session-1" });
    expect(saveMock).toHaveBeenCalledWith(state, "session-1");
  });

  it("PUT creates a session when no id is sent", async () => {
    saveMock.mockResolvedValue("fresh-id");
    const res = await PUT(putReq({ state }));
    expect(await res.json()).toEqual({ id: "fresh-id" });
    expect(saveMock).toHaveBeenCalledWith(state, undefined);
  });

  it("PUT responds 500 when the write fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    saveMock.mockResolvedValue(null);
    const res = await PUT(putReq({ state }));
    expect(res.status).toBe(500);
  });
});
