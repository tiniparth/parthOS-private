import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { env } from "@/lib/env";
import { sendMessage, sendMessageWithButtons, answerCallbackQuery, editMessageText, sendTyping, downloadFileAsBase64 } from "@/lib/telegram";
import { db } from "@/lib/supabase";
import { think } from "@/lib/brain";
import { GeminiRateLimitError } from "@/lib/brain/gemini";
import { logCapture, executeActions } from "@/lib/memory";
import { setSetting, getActiveModel, MODELS } from "@/lib/settings";
import { isGmailConnected, triageInbox } from "@/lib/gmail";
import { googleConnected } from "@/lib/google";
import { searchFiles } from "@/lib/drive";
import { transcribe } from "@/lib/voice";
import { generateDoc } from "@/lib/docgen";
import { createDoc } from "@/lib/docs";

/** One queued portfolio item → a Telegram message with Publish/Skip buttons. */
async function sendPortfolioCard(chatId: number, item: { id: number; kind: string; title: string; hook?: string | null; date_label?: string | null }) {
  const lines = [`📤 Site suggestion — ${item.kind}`, "", item.title];
  if (item.date_label) lines.push(item.date_label);
  if (item.hook) lines.push(`“${item.hook}”`);
  lines.push("", "Publish to parth-index.vercel.app?");
  await sendMessageWithButtons(chatId, lines.join("\n"), [[
    { text: "✅ Publish", callback_data: `pf:pub:${item.id}` },
    { text: "❌ Skip", callback_data: `pf:rej:${item.id}` },
  ]]);
}

/** Inline-button presses (currently: portfolio publish/skip). */
async function handleCallback(cq: any) {
  const data: string = cq?.data ?? "";
  const chatId = cq?.message?.chat?.id;
  const messageId = cq?.message?.message_id;
  const m = data.match(/^pf:(pub|rej):(\d+)$/);
  if (!m || !chatId) { await answerCallbackQuery(cq.id); return; }
  const [, verb, id] = m;
  const { data: rows } = await db().from("portfolio_queue").select("id,title,status").eq("id", Number(id)).limit(1);
  const item = rows?.[0];
  if (!item) {
    await answerCallbackQuery(cq.id, "That item no longer exists.");
    if (messageId) await editMessageText(chatId, messageId, "🗑️ This suggestion was removed.");
    return;
  }
  if (verb === "pub") {
    await db().from("portfolio_queue").update({ status: "live", published_at: new Date().toISOString() }).eq("id", item.id);
    await answerCallbackQuery(cq.id, "Live on the site 🎉");
    if (messageId) await editMessageText(chatId, messageId, `✅ LIVE on parth-index.vercel.app\n\n${item.title}`);
  } else {
    await db().from("portfolio_queue").update({ status: "rejected" }).eq("id", item.id);
    await answerCallbackQuery(cq.id, "Skipped.");
    if (messageId) await editMessageText(chatId, messageId, `❌ Skipped (kept privately)\n\n${item.title}`);
  }
}

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
  if (cmd === "/portfolio" || cmd === "/site") {
    const { data: pending } = await db()
      .from("portfolio_queue")
      .select("id,kind,title,hook,date_label")
      .in("status", ["suggested", "approved"])
      .order("created_at", { ascending: false })
      .limit(8);
    const { count: liveCount } = await db()
      .from("portfolio_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "live");
    if (!pending?.length) {
      await sendMessage(chatId, `🗂 Portfolio queue is clear — nothing awaiting your yes.\n${liveCount || 0} item(s) currently live on parth-index.vercel.app.\n\nMention a win (race, build, memo) and I'll draft it for the site.`);
      return true;
    }
    await sendMessage(chatId, `🗂 ${pending.length} suggestion(s) awaiting your yes (${liveCount || 0} live):`);
    for (const item of pending) await sendPortfolioCard(chatId, item);
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

  // Inline-button presses arrive as callback_query, not message.
  const cq = update?.callback_query;
  if (cq) {
    const cqChat = cq?.message?.chat?.id;
    const allowedCq = env.allowedChatId();
    if (allowedCq && String(cqChat) === String(allowedCq)) {
      after(() => handleCallback(cq).catch((e) => console.error("handleCallback error:", e)));
    }
    return NextResponse.json({ ok: true });
  }

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
    // Brain-switch commands are handled instantly (no Gemini call, no quota spent).
    if (text && (await handleCommand(text, chatId))) return;

    await sendTyping(chatId);

    // Resolve to text — transcribe voice notes via Groq Whisper.
    let userText = text;
    if (voice?.file_id) {
      const audio = await downloadFileAsBase64(voice.file_id);
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
      await sendMessage(chatId, "I can handle text or voice notes right now. 🙂");
      return;
    }

    const result = await think({ text: userText });

    await logCapture(voice ? "voice" : "text", userText, update);
    const done = await executeActions(result.actions);

    // Feedback loop: echo WHERE each capture actually landed, so a misroute
    // (e.g. a day-recording going to the wrong place) is visible immediately.
    let reply = result.reply;
    const footer = done.map((d) => {
      if (d.startsWith("portfolio:")) return "📤 site suggestion queued";
      if (d.startsWith("journalled")) return "📓 journal";
      if (d.startsWith("task:")) return `✅ task — ${d.slice(5).trim()}`;
      if (d.startsWith("expense:")) return `💸 expense ₹${d.slice(8).trim()}`;
      if (d.startsWith("habit:")) return `🔁 habit — ${d.slice(6).trim()}`;
      if (d.startsWith("fact")) return "🧠 fact saved";
      if (d.startsWith("milestone:")) return `🏆 milestone — ${d.slice(10).trim()}`;
      if (d.startsWith("event:")) {
        const link = d.match(/https:\/\/meet\.google\.com\/\S+/)?.[0];
        return `📅 event${link ? ` · 🔗 ${link}` : d.includes("no Meet link") ? " · ⚠️ no Meet link" : ""}`;
      }
      return d;
    });
    if (footer.length) reply += `\n\n— saved: ${footer.join("  ·  ")}`;

    await sendMessage(chatId, reply);

    // Any portfolio suggestions get their own card with Publish/Skip buttons.
    for (const d of done) {
      const pm = d.match(/^portfolio:(\d+):(.*)$/);
      if (!pm) continue;
      const { data: rows } = await db().from("portfolio_queue").select("id,kind,title,hook,date_label").eq("id", Number(pm[1])).limit(1);
      if (rows?.[0]) await sendPortfolioCard(chatId, rows[0]);
    }
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
