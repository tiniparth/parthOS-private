import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { env } from "@/lib/env";
import { sendMessage, sendTyping, downloadFileAsBase64 } from "@/lib/telegram";
import { think } from "@/lib/brain";
import { GeminiRateLimitError } from "@/lib/brain/gemini";
import { logCapture, executeActions } from "@/lib/memory";
import { setSetting, getActiveModel, MODELS } from "@/lib/settings";
import { isGmailConnected, triageInbox } from "@/lib/gmail";
import { googleConnected } from "@/lib/google";
import { searchFiles } from "@/lib/drive";
import { transcribe, transcribeRecording } from "@/lib/voice";
import { summariseMeeting } from "@/lib/meeting";
import { generateDoc } from "@/lib/docgen";
import { createDoc } from "@/lib/docs";

/** Handle brain-switch commands. Returns true if the message was a command. */
async function handleCommand(text: string, chatId: number): Promise<boolean> {
  const cmd = text.trim().toLowerCase();
  if (cmd === "/smart" || cmd === "/model flash") {
    await setSetting("model", MODELS.smart);
    await sendMessage(chatId, "🧠 Smart brain ON (gemini-2.5-flash, ~20 msgs/day). Use it for meaty stuff — send /fast to switch back.");
    return true;
  }
  if (cmd === "/fast" || cmd === "/model lite") {
    await setSetting("model", MODELS.fast);
    await sendMessage(chatId, "⚡ Fast brain ON (gemini-2.5-flash-lite, ~1000/day). Your daily driver.");
    return true;
  }
  if (cmd === "/model") {
    const m = await getActiveModel();
    const label = m === MODELS.smart ? "🧠 smart (flash)" : "⚡ fast (flash-lite)";
    await sendMessage(chatId, `Current brain: ${label}\n${m}\n\n/smart = meaty tasks · /fast = daily driver`);
    return true;
  }
  if (cmd === "/inbox" || cmd === "/mail") {
    if (!(await isGmailConnected())) {
      await sendMessage(chatId, "Gmail isn't connected yet. Open the dashboard → Mail → Connect Gmail.");
      return true;
    }
    const mail = await triageInbox();
    const high = mail.filter((m) => m.importance === "high");
    if (!high.length) {
      await sendMessage(chatId, "📭 Nothing urgent in your inbox right now.");
      return true;
    }
    const lines = high.map((m) => `• ${m.subject}\n   ${m.from.replace(/<.*>/, "").trim()}${m.needs_reply ? " · ↩️ reply" : ""}\n   ${m.why}`);
    await sendMessage(chatId, `📨 ${high.length} need attention:\n\n${lines.join("\n\n")}`);
    return true;
  }
  if (cmd.startsWith("/find ") || cmd.startsWith("/find\n")) {
    const q = text.trim().slice(5).trim();
    if (!q) { await sendMessage(chatId, "Usage: /find <what to search for in your Drive>"); return true; }
    if (!(await googleConnected())) { await sendMessage(chatId, "Connect Google first (dashboard → Mail → Connect)."); return true; }
    const files = await searchFiles(q, 8);
    if (!files.length) { await sendMessage(chatId, `No Drive files match "${q}".`); return true; }
    const lines = files.map((f) => `• ${f.name}\n   ${f.link}`);
    await sendMessage(chatId, `📁 Found ${files.length} for "${q}":\n\n${lines.join("\n\n")}`);
    return true;
  }
  if (cmd.startsWith("/doc")) {
    const topic = text.trim().replace(/^\/doc\s*/i, "").trim();
    if (!topic) { await sendMessage(chatId, "Usage: /doc <topic> — e.g. /doc company profile of Sterling & Wilson"); return true; }
    if (!(await googleConnected())) { await sendMessage(chatId, "Connect Google first (dashboard → Mail → Connect)."); return true; }
    await sendMessage(chatId, "📝 Drafting your doc… (~20–40s)");
    try {
      const { title, html } = await generateDoc(topic);
      const link = await createDoc(title, html);
      if (link) await sendMessage(chatId, `✅ ${title}\n${link}`);
      else await sendMessage(chatId, "I drafted it but couldn't create the Google Doc — you may need to grant doc-write access (dashboard → Mail → Reconnect).");
    } catch (e) {
      console.error("/doc error:", e);
      await sendMessage(chatId, "Couldn't generate that doc — try again in a moment.");
    }
    return true;
  }
  return false;
}

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

/** Telegram audio can arrive three ways: a held-button voice note (msg.voice,
    OGG), an audio file (msg.audio), or any file sent as a document (msg.document).
    Recordings are the latter two, or a long voice note. */
function pickAudio(msg: any): { file: any; isRecording: boolean } | null {
  const voice = msg?.voice;
  const audio = msg?.audio;
  const doc = msg?.document;
  const isAudioDoc =
    doc && (/^audio\//i.test(doc.mime_type || "") ||
      /\.(mp3|m4a|wav|ogg|opus|aac|flac|webm|mp4|mpeg|mpga)$/i.test(doc.file_name || ""));
  if (audio) return { file: audio, isRecording: true };
  if (isAudioDoc) return { file: doc, isRecording: true };
  if (voice) return { file: voice, isRecording: (voice.duration ?? 0) > 120 };
  return null;
}

const TG_MAX_BYTES = 20_000_000; // Telegram Bot API can't serve files over ~20 MB.

async function handleMessage(update: unknown, msg: any, chatId: number) {
  const text: string = msg?.text ?? msg?.caption ?? "";
  const media = pickAudio(msg);

  try {
    // Brain-switch commands are handled instantly (no Gemini call, no quota spent).
    if (text && (await handleCommand(text, chatId))) return;

    // --- Call recording → transcribe → summarise → action items (separate flow) ---
    if (media?.isRecording) {
      await handleRecording(update, media.file, chatId);
      return;
    }

    await sendTyping(chatId);

    // Resolve to text — transcribe short voice notes via Groq Whisper (fast model).
    let userText = text;
    if (media?.file?.file_id) {
      const audio = await downloadFileAsBase64(media.file.file_id, media.file.mime_type);
      if (!audio) {
        await sendMessage(chatId, "Hmm, I couldn't fetch that voice note. Mind trying again?");
        return;
      }
      userText = await transcribe(audio.base64, audio.mime);
      if (!userText) {
        await sendMessage(chatId, "I couldn't make out that voice note — try again?");
        return;
      }
    }
    if (!userText) {
      await sendMessage(chatId, "I can handle text, voice notes, and call recordings right now. 🙂");
      return;
    }

    const result = await think({ text: userText });

    await logCapture(media ? "voice" : "text", userText, update);
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

/** Call-recording pipeline: download → Whisper (accurate model) → summarise →
    create Parth's action items as tasks → reply with a clean summary. The full
    transcript is logged to captures; the summary is saved as a note. */
async function handleRecording(update: unknown, file: any, chatId: number) {
  if (file?.file_size && file.file_size > TG_MAX_BYTES) {
    await sendMessage(
      chatId,
      "📦 That recording is over Telegram's 20 MB limit for bots, so I can't fetch it.\n\nQuick fixes: export it as a ~64 kbps mp3 (a 45-min call fits easily), or split it in two — then resend."
    );
    return;
  }

  await sendMessage(chatId, "📥 Got your recording — transcribing & summarising… (~30–60s for a long call)");
  await sendTyping(chatId);

  const audio = await downloadFileAsBase64(file.file_id, file.mime_type);
  if (!audio) {
    await sendMessage(chatId, "I couldn't fetch that file — it may be over Telegram's 20 MB bot limit. Try compressing or splitting it.");
    return;
  }

  const transcript = await transcribeRecording(audio.base64, audio.mime);
  if (!transcript || transcript.length < 5) {
    await sendMessage(chatId, "I couldn't make out any speech in that audio. Is it a clear recording? Try resending.");
    return;
  }

  const model = await getActiveModel();
  const m = await summariseMeeting(transcript, model);

  // Parth's own follow-ups become tasks; others' are listed but not created.
  const mine = m.action_items.filter((a) => !a.owner || /\b(parth|me|myself|i)\b/i.test(a.owner));
  const others = m.action_items.filter((a) => !mine.includes(a));

  const actions: any[] = [
    { type: "create_note", content: `📞 ${m.title}${m.client ? ` · ${m.client}` : ""}\n\n${m.summary}`.slice(0, 4000), tags: ["call", m.client].filter(Boolean) },
    ...mine.map((a) => ({ type: "create_task", title: a.title, due_date: a.due_date || null })),
  ];
  await logCapture("voice", `[CALL RECORDING — ${m.title}]\n${transcript}`, update);
  await executeActions(actions);

  // Build a scannable reply (Telegram caps at 4096 chars).
  const parts: string[] = [`📞 ${m.title}${m.client ? ` · ${m.client}` : ""}`, "", m.summary];
  if (m.decisions.length) parts.push("", "📌 Decisions:", ...m.decisions.map((d) => `• ${d}`));
  if (mine.length) parts.push("", `✅ Added ${mine.length} task${mine.length > 1 ? "s" : ""} for you:`, ...mine.map((a) => `• ${a.title}${a.due_date ? ` (due ${a.due_date})` : ""}`));
  if (others.length) parts.push("", "👥 Others' follow-ups (not added):", ...others.map((a) => `• ${a.owner}: ${a.title}`));
  parts.push("", "🗂️ Full transcript saved.");
  let reply = parts.join("\n");
  if (reply.length > 4000) reply = reply.slice(0, 3990) + "\n…";
  await sendMessage(chatId, reply);
}

/** Health check in a browser. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "parth-os telegram webhook" });
}
