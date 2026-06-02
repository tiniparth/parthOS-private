/* Groq brain provider (free tier). OpenAI-compatible chat completions with
   JSON mode. Drop-in for gemini.ts's generateJSON signature — audio parts are
   ignored here (voice is transcribed upstream via Groq Whisper → text). */
import { env } from "../env";
import { GeminiRateLimitError, type GeminiPart } from "./gemini";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function generateJSON(
  systemPrompt: string,
  parts: GeminiPart[],
  _schema: object,
  model: string = env.brainModel()
): Promise<any> {
  const userText = parts.map((p) => p.text ?? "").join("\n").trim() || "(no content)";
  const body = {
    model,
    temperature: 0.4,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt + "\n\nRespond with ONE valid JSON object only — no markdown, no text outside the JSON." },
      { role: "user", content: userText },
    ],
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.groqKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 429 || res.status === 503) {
      const detail = await res.text().catch(() => "");
      console.error(`Groq ${res.status} (attempt ${attempt})`);
      if (attempt < 2) { await sleep(3000 * (attempt + 1)); continue; }
      throw new GeminiRateLimitError();
    }
    if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);

    const j = await res.json();
    let text: string = j?.choices?.[0]?.message?.content ?? "";
    text = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      return JSON.parse(text);
    } catch {
      if (attempt < 2) { console.error("Groq JSON parse failed; regenerating"); continue; }
      const rm = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (rm) { try { return { reply: JSON.parse(`"${rm[1]}"`), actions: [] }; } catch { /* */ } }
      throw new Error(`Groq non-JSON: ${text.slice(0, 300)}`);
    }
  }
  throw new GeminiRateLimitError();
}
