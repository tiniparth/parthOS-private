import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { isAuthed } from "@/lib/auth";
import { todayISO } from "@/lib/time";

export const runtime = "nodejs";

/** Toggle today's log for a habit (dashboard). Marks done, or un-marks if already done today. */
export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ ok: false }, { status: 401 });
  const { habit } = await req.json().catch(() => ({}));
  if (!habit) return NextResponse.json({ ok: false, reason: "habit required" }, { status: 400 });

  const sb = db();
  const today = todayISO();
  const { data } = await sb.from("habit_logs").select("id").eq("habit", habit).eq("done_on", today);

  if (data && data.length > 0) {
    await sb.from("habit_logs").delete().eq("habit", habit).eq("done_on", today);
    return NextResponse.json({ ok: true, done: false });
  }
  await sb.from("habit_logs").insert({ habit, done_on: today });
  return NextResponse.json({ ok: true, done: true });
}
