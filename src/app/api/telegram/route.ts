import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { env } from "@/lib/env";
import { sendMessage, sendTyping, downloadFileAsBase64 } from "@/lib/telegram";
import { think } from "@/lib/brain";
import { GeminiRateLimitError } from "@/lib/brain/gemini";
import { logCapture, executeActions } from "@/lib/memory";
import type { BrainInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Telegram webhook.

   IMPORTANT: we answer Telegram with 200 immediately, then do the slow work
   (Gemini + DB + reply) in after(). If we did it inline, a cold start could
   cross Telegram's timeout → it 504s, hides the reply, and retries. */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== env.webhookSecret()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  const chatId: number | undefined = msg?.chat?.id;
  if (!chatId) return NextResponse.json({ ok: true });

  const allowed = env.allowedChatId();

  // Bootstrap: no allowlist yet → reveal chat id (fast, do inline).
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

  // Hand the heavy lifting to the background so Telegram gets an instant 200.
  after(() => handleMessage(update, msg, chatId));

  return NextResponse.json({ ok: true });
}

async function handleMessage(update: unknown, msg: any, chatId: number) {
  const text: string = msg?.text ?? msg?.caption ?? "";
  const voice = msg?.voice ?? msg?.audio;

  try {
    await sendTyping(chatId);

    let input: BrainInput;
    if (voice?.file_id) {
      const audio = await downloadFileAsBase64(voice.file_id);
      if (!audio) {
        await sendMessage(chatId, "Hmm, I couldn't fetch that voice note. Mind trying again?");
        return;
      }
      input = { audio, text };
    } else if (text) {
      input = { text };
    } else {
      await sendMessage(chatId, "I can handle text or voice notes right now. 🙂");
      return;
    }

    const result = await think(input);

    await logCapture(voice ? "voice" : "text", result.transcript || text, update);
    await executeActions(result.actions);

    await sendMessage(chatId, result.reply);
  } catch (err) {
    console.error("handleMessage error:", err);
    if (err instanceof GeminiRateLimitError) {
      await sendMessage(
        chatId,
        "My free brain hit its rate limit 🥵 (too many messages too fast). Give it ~30s and resend."
      );
    } else {
      await sendMessage(chatId, "Something went wrong on my end 😕 — try again in a moment.");
    }
  }
}

/** Health check in a browser. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "parth-os telegram webhook" });
}
