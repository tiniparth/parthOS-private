/* Voice transcription via Groq Whisper (free). Telegram voice notes are OGG/Opus. */
import { env } from "./env";

export async function transcribe(base64: string, mime = "audio/ogg"): Promise<string> {
  const buf = Buffer.from(base64, "base64");
  const form = new FormData();
  form.append("file", new Blob([buf], { type: mime }), "voice.ogg");
  form.append("model", "whisper-large-v3-turbo");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.groqKey()}` },
    body: form,
  });
  if (!res.ok) {
    console.error("Groq Whisper error:", res.status, await res.text().catch(() => ""));
    return "";
  }
  const j = await res.json();
  return (j.text || "").trim();
}
