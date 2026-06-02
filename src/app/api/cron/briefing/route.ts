import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendMessage } from "@/lib/telegram";
import { buildBriefing } from "@/lib/briefing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily briefing. Triggered by Vercel Cron (which sends
    `Authorization: Bearer <CRON_SECRET>` because CRON_SECRET is set on the
    project). Also manually triggerable with the same header for testing. */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const chatId = env.allowedChatId();
  if (!chatId) return NextResponse.json({ ok: false, reason: "ALLOWED_CHAT_ID not set" });

  try {
    const text = await buildBriefing();
    await sendMessage(chatId, text);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("briefing error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
