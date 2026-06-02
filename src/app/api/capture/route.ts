import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { think } from "@/lib/brain";
import { logCapture, executeActions } from "@/lib/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Web quick-capture: same brain pipeline as Telegram, from the dashboard. */
export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ ok: false }, { status: 401 });
  const { text } = await req.json().catch(() => ({}));
  if (!text || !String(text).trim()) return NextResponse.json({ ok: false, reason: "empty" }, { status: 400 });

  try {
    const result = await think({ text: String(text) });
    await logCapture("text", String(text), { source: "dashboard" });
    await executeActions(result.actions);
    return NextResponse.json({ ok: true, reply: result.reply });
  } catch (e) {
    console.error("capture error:", e);
    return NextResponse.json({ ok: false, reply: "Something went wrong — try again." }, { status: 500 });
  }
}
