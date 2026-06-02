import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendMessage } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Telegram webhook. Telegram POSTs every incoming message here. */
export async function POST(req: NextRequest) {
  // 1. Verify the request really came from Telegram (secret token header).
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== env.webhookSecret()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  const chatId: number | undefined = msg?.chat?.id;
  const text: string = msg?.text ?? "";

  // Ignore anything that isn't a normal message (edits, joins, etc.)
  if (!chatId) return NextResponse.json({ ok: true });

  const allowed = env.allowedChatId();

  // Bootstrap: no allowlist configured yet → reveal the chat id so we can lock it.
  if (!allowed) {
    await sendMessage(
      chatId,
      `👋 I'm alive!\n\nYour chat id is: ${chatId}\n\nSet this as ALLOWED_CHAT_ID and redeploy to lock me to you only.`
    );
    return NextResponse.json({ ok: true });
  }

  // Enforce allowlist: silently ignore anyone who isn't Parth.
  if (String(chatId) !== String(allowed)) {
    return NextResponse.json({ ok: true });
  }

  // Phase 2 behaviour: echo. (Phase 3 swaps this for the brain.)
  await sendMessage(chatId, `got it ✅: ${text}`);
  return NextResponse.json({ ok: true });
}

/** Health check in a browser. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "parth-os telegram webhook" });
}
