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
