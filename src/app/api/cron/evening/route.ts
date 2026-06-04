import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendMessage } from "@/lib/telegram";
import { buildEvening } from "@/lib/evening";
import { todayISO } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Evening nudge (~9pm IST via Vercel Cron). Surfaces tomorrow's training +
    today's accountability. On Sundays it also kicks the weekly consolidation
    (we run it from here so we stay within Hobby's cron-job limit). */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const chatId = env.allowedChatId();
  if (!chatId) return NextResponse.json({ ok: false, reason: "ALLOWED_CHAT_ID not set" });

  try {
    const text = await buildEvening();
    if (text) await sendMessage(chatId, text);

    // Sunday (IST date) → also run the weekly review/consolidation.
    const dow = new Date(todayISO() + "T00:00:00Z").getUTCDay(); // 0 = Sunday
    let weekly = false;
    if (dow === 0) {
      try {
        const r = await fetch(new URL("/api/cron/consolidate", req.url), {
          headers: { Authorization: `Bearer ${env.cronSecret()}` },
        });
        weekly = r.ok;
      } catch (e) {
        console.error("evening→consolidate failed:", e);
      }
    }
    return NextResponse.json({ ok: true, sent: !!text, weekly });
  } catch (e) {
    console.error("evening error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
