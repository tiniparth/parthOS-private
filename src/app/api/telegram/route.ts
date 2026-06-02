import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendMessage, sendTyping, downloadFileAsBase64 } from "@/lib/telegram";
import { think } from "@/lib/brain";
import { logCapture, executeActions } from "@/lib/memory";
import type { BrainInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Telegram webhook. Telegram POSTs every incoming message here. */
export async function POST(req: NextRequest) {
  // 1. Verify the request really came from Telegram.
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== env.webhookSecret()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  const chatId: number | undefined = msg?.chat?.id;
  if (!chatId) return NextResponse.json({ ok: true });

  const allowed = env.allowedChatId();

  // Bootstrap: no allowlist yet → reveal chat id.
  if (!allowed) {
    await sendMessage(
      chatId,
      `👋 I'm alive!\n\nYour chat id is: ${chatId}\n\nSet this as ALLOWED_CHAT_ID and redeploy to lock me to you only.`
    );
    return NextResponse.json({ ok: true });
  }

  // Enforce allowlist: silently ignore strangers.
  if (String(chatId) !== String(allowed)) {
    return NextResponse.json({ ok: true });
  }

  const text: string = msg?.text ?? msg?.caption ?? "";
  const voice = msg?.voice ?? msg?.audio;

  try {
    await sendTyping(chatId);

    // Build brain input (text or voice).
    let input: BrainInput;
    if (voice?.file_id) {
      const audio = await downloadFileAsBase64(voice.file_id);
      if (!audio) {
        await sendMessage(chatId, "Hmm, I couldn't fetch that voice note. Mind trying again?");
        return NextResponse.json({ ok: true });
      }
      input = { audio, text };
    } else if (text) {
      input = { text };
    } else {
      await sendMessage(chatId, "I can handle text or voice notes right now. 🙂");
      return NextResponse.json({ ok: true });
    }

    const result = await think(input);

    // Persist: log the raw capture, then run the actions.
    await logCapture(voice ? "voice" : "text", result.transcript || text, update);
    await executeActions(result.actions);

    await sendMessage(chatId, result.reply);
  } catch (err) {
    console.error("webhook error:", err);
    await sendMessage(chatId, "Something went wrong on my end 😕 — try again in a moment.");
  }

  return NextResponse.json({ ok: true });
}

/** Health check in a browser. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "parth-os telegram webhook" });
}
