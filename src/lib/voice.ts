/* Audio transcription via Groq Whisper (free).
   - Short Telegram voice notes (OGG/Opus) → whisper-large-v3-turbo (fast).
   - Call recordings (mp3/m4a/wav, often Hindi/Marathi/English mixed) →
     whisper-large-v3 (more accurate) via transcribeRecording(). */
import { env } from "./env";

const EXT: Record<string, string> = {
  "audio/ogg": "ogg", "audio/opus": "opus", "audio/mpeg": "mp3", "audio/mp3": "mp3",
  "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/wav": "wav",
  "audio/x-wav": "wav", "audio/webm": "webm", "audio/flac": "flac",
};

export async function transcribe(
  base64: string,
  mime = "audio/ogg",
  opts: { model?: string } = {}
): Promise<string> {
  const buf = Buffer.from(base64, "base64");
  const ext = EXT[mime] || "mp3";
  const form = new FormData();
  form.append("file", new Blob([buf], { type: mime }), `audio.${ext}`);
  form.append("model", opts.model || "whisper-large-v3-turbo");
  // Leave `language` unset → Whisper auto-detects (handles Hindi/Marathi/English).

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

/** Higher-accuracy model for call recordings (worth the extra latency for
    long, mixed-language audio). */
export function transcribeRecording(base64: string, mime: string): Promise<string> {
  return transcribe(base64, mime, { model: "whisper-large-v3" });
}
