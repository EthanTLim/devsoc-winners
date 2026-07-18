import { NextRequest, NextResponse } from "next/server";
import { getSupabase, loadSessionState, saveSessionState, SessionStateSchema } from "@/lib/db";

export const runtime = "nodejs";

// Anonymous session persistence. GET restores a saved snapshot; PUT upserts
// one (creating the session row on first save). When Supabase is not
// configured both respond 503 and the client silently stays on
// sessionStorage-only state.

export async function GET(req: NextRequest) {
  try {
    if (!getSupabase()) {
      return NextResponse.json({ error: "Persistence is not configured." }, { status: 503 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing session id." }, { status: 400 });
    }

    const state = await loadSessionState(id);
    return NextResponse.json({ state });
  } catch (err) {
    console.error("[api/session] GET failed:", err);
    return NextResponse.json({ error: "Failed to load session." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!getSupabase()) {
      return NextResponse.json({ error: "Persistence is not configured." }, { status: 503 });
    }

    const body = await req.json().catch(() => null);
    const parsedState = SessionStateSchema.safeParse(body?.state);
    if (!parsedState.success) {
      return NextResponse.json({ error: "Invalid session state." }, { status: 400 });
    }
    const id = typeof body?.id === "string" && body.id ? body.id : undefined;

    const savedId = await saveSessionState(parsedState.data, id);
    if (!savedId) {
      return NextResponse.json({ error: "Failed to save session." }, { status: 500 });
    }
    return NextResponse.json({ id: savedId });
  } catch (err) {
    console.error("[api/session] PUT failed:", err);
    return NextResponse.json({ error: "Failed to save session." }, { status: 500 });
  }
}
