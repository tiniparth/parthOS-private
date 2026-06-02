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
