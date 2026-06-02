/* Gemini provider. Calls the REST API directly (no SDK — fewer moving parts,
   and the API key format is already validated against this endpoint).
   Forces structured JSON via responseSchema so parsing never guesses. */
import { env } from "../env";

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

/** Thrown when Gemini's free-tier rate limit (429) is hit after retries. */
export class GeminiRateLimitError extends Error {
  constructor() {
    super("Gemini rate limit (429)");
    this.name = "GeminiRateLimitError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function generateJSON(
  systemPrompt: string,
  parts: GeminiPart[],
  schema: object
): Promise<any> {
  const model = env.geminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiKey()}`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.4,
      // Hard cap so a degenerate repetition loop can't produce a 5k-char field.
      maxOutputTokens: 1024,
      // Disable extended thinking for snappy, cheap replies.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  // Retry transient rate-limit / overload (429/503) with backoff. We run in
  // after(), so a couple of seconds of backoff is fine.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 429 || res.status === 503) {
      if (attempt < 2) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      throw new GeminiRateLimitError();
    }

    if (!res.ok) {
      throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    }

    const j = await res.json();
    const text: string =
      j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Gemini returned non-JSON: ${text.slice(0, 300)}`);
    }
  }

  throw new GeminiRateLimitError();
}
