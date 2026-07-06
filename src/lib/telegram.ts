/* Thin Telegram Bot API helper. Server-side only. */
import { env } from "./env";

const api = (method: string) =>
  `https://api.telegram.org/bot${env.telegramToken()}/${method}`;

/** Send a text message. parseMode "Markdown" by default; pass undefined for plain. */
export async function sendMessage(
  chatId: number | string,
  text: string,
  parseMode: "Markdown" | "HTML" | undefined = undefined
) {
  const res = await fetch(api("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(parseMode ? { parse_mode: parseMode } : {}),
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    console.error("telegram sendMessage failed:", res.status, await res.text());
  }
  return res.ok;
}

/** One row of inline buttons under a message. */
export type InlineButton = { text: string; callback_data: string };

/** Send a message with inline buttons (e.g. Publish / Skip). */
export async function sendMessageWithButtons(
  chatId: number | string,
  text: string,
  buttons: InlineButton[][]
) {
  const res = await fetch(api("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: buttons },
    }),
  });
  if (!res.ok) {
    console.error("telegram sendMessageWithButtons failed:", res.status, await res.text());
  }
  return res.ok;
}

/** Ack a button press (stops the client-side spinner; optional toast text). */
export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(api("answerCallbackQuery"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, ...(text ? { text } : {}) }),
  }).catch(() => {});
}

/** Rewrite a sent message (used to replace buttons with the outcome). */
export async function editMessageText(chatId: number | string, messageId: number, text: string) {
  await fetch(api("editMessageText"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, disable_web_page_preview: true }),
  }).catch(() => {});
}

/** Send the "typing…" indicator so replies feel responsive. */
export async function sendTyping(chatId: number | string) {
  await fetch(api("sendChatAction"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  }).catch(() => {});
}

/** Download a Telegram file (e.g. a voice note) and return it base64-encoded.
    Telegram voice notes are OGG/Opus. */
export async function downloadFileAsBase64(
  fileId: string
): Promise<{ base64: string; mime: string } | null> {
  const metaRes = await fetch(api("getFile"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const meta = await metaRes.json();
  if (!meta.ok) return null;

  const fileUrl = `https://api.telegram.org/file/bot${env.telegramToken()}/${meta.result.file_path}`;
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) return null;

  const buf = Buffer.from(await fileRes.arrayBuffer());
  return { base64: buf.toString("base64"), mime: "audio/ogg" };
}
