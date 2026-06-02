import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";

/** Mark a task done / reopen it, from the dashboard. Requires the auth cookie. */
export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ ok: false }, { status: 401 });

  const { id, done } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  await db()
    .from("tasks")
    .update({
      status: done ? "done" : "open",
      done_at: done ? new Date().toISOString() : null,
    })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
