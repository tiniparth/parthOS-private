import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, focus: (await getSetting("focus")) ?? "" });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ ok: false }, { status: 401 });
  const { focus } = await req.json().catch(() => ({}));
  await setSetting("focus", String(focus ?? "").slice(0, 200));
  return NextResponse.json({ ok: true });
}
