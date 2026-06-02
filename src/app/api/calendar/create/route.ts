import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { createEvent } from "@/lib/calendar";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ ok: false }, { status: 401 });
  const { summary, when, duration_min } = await req.json().catch(() => ({}));
  if (!summary || !when) return NextResponse.json({ ok: false, reason: "summary + when required" }, { status: 400 });
  const ok = await createEvent(String(summary), String(when), Number(duration_min) || 30);
  return NextResponse.json({ ok });
}
