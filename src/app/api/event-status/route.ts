import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Parth's personal "going/done" status on calendar events — stored in settings
    JSON (no edit to the real Google event). { [eventId]: "done" }. */
async function read(): Promise<Record<string, string>> {
  try { return JSON.parse((await getSetting("event_status")) || "{}"); } catch { return {}; }
}

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, status: await read() });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ ok: false }, { status: 401 });
  const { id, done } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const map = await read();
  if (done) map[id] = "done"; else delete map[id];
  await setSetting("event_status", JSON.stringify(map));
  return NextResponse.json({ ok: true });
}
