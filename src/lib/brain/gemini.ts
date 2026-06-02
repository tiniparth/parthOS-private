/* Gemini provider. Calls the REST API directly (no SDK — fewer moving parts,
   and the API key format is already validated against this endpoint).
   Forces structured JSON via responseSchema so parsing never guesses. */
import { env } from "../env";

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

/** Thrown when Gemini's free-tier quota (429) is hit after retries. */
export class GeminiRateLimitError extends Error {
  constructor() {
    super("Gemini quota exhausted (429)");
    this.name = "GeminiRateLimitError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function generateJSON(
  systemPrompt: string,
  parts: GeminiPart[],
  schema: object,
  model: string = env.geminiModel()
): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiKey()}`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.6,
      maxOutputTokens: 4096,
      // NOTE: we intentionally do NOT set thinkingBudget:0 — leaving the 2.5
      // models' default light thinking on produces far more coherent, loop-free
      // structured output (disabling it was causing repetition loops). Thinking
      // tokens don't count against the daily request quota.
      // (frequencyPenalty/presencePenalty are NOT supported on flash-lite.)
    },
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 429 || res.status === 503) {
      const detail = await res.text().catch(() => "");
      let waitMs = 8000;
      const m =
        detail.match(/retry in ([\d.]+)s/i) || detail.match(/"retryDelay":\s*"([\d.]+)s"/i);
      if (m) waitMs = Math.ceil(parseFloat(m[1]) * 1000) + 1200;
      waitMs = Math.min(waitMs, 12000);
      // A per-DAY quota won't recover from a short wait — but a per-minute one will.
      console.error(`Gemini ${res.status} (attempt ${attempt}); waiting ${waitMs}ms`);
      if (attempt < 2) {
        await sleep(waitMs);
        continue;
      }
      throw new GeminiRateLimitError();
    }

    if (!res.ok) {
      throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    }

    const j = await res.json();
    const finishReason = j?.candidates?.[0]?.finishReason;
    let text: string =
      j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";

    // Strip accidental markdown fences (shouldn't happen with JSON mime, but be safe).
    text = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    try {
      return JSON.parse(text);
    } catch {
      // flash-lite occasionally loops a field past the token cap → truncated JSON.
      // The loop is stochastic (temp 0.6), so just regenerate — usually clean next time.
      if (attempt < 2) {
        console.error(`Gemini JSON parse failed (finishReason=${finishReason}); regenerating`);
        continue;
      }
      // Last resort: recover the human reply so Parth isn't left hanging; drop actions.
      const rm = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (rm) {
        try {
          const reply = JSON.parse(`"${rm[1]}"`);
          console.error(`Gemini JSON salvaged (finishReason=${finishReason}); dropped actions`);
          return { reply, actions: [] };
        } catch {
          /* fall through */
        }
      }
      throw new Error(
        `Gemini returned non-JSON (finishReason=${finishReason}): ${text.slice(0, 300)}`
      );
    }
  }

  throw new GeminiRateLimitError();
}
