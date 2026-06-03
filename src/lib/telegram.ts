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

const MIME_BY_EXT: Record<string, string> = {
  ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/opus", mp3: "audio/mpeg",
  mpeg: "audio/mpeg", mpga: "audio/mpeg", m4a: "audio/mp4", mp4: "audio/mp4",
  aac: "audio/aac", wav: "audio/wav", webm: "audio/webm", flac: "audio/flac",
};

/** Download a Telegram file and return it base64-encoded, with the MIME inferred
    from the file extension (voice notes are OGG; recordings may be mp3/m4a/wav).
    Telegram's Bot API only serves files up to 20 MB → returns null if too big. */
export async function downloadFileAsBase64(
  fileId: string,
  mimeHint?: string
): Promise<{ base64: string; mime: string } | null> {
  const metaRes = await fetch(api("getFile"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const meta = await metaRes.json();
  if (!meta.ok) return null; // includes "file is too big" (>20 MB)

  const filePath: string = meta.result.file_path || "";
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const mime = MIME_BY_EXT[ext] || mimeHint || "audio/ogg";

  const fileUrl = `https://api.telegram.org/file/bot${env.telegramToken()}/${filePath}`;
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) return null;

  const buf = Buffer.from(await fileRes.arrayBuffer());
  return { base64: buf.toString("base64"), mime };
}
