/* Gemini provider. Calls the REST API directly (no SDK — fewer moving parts,
   and the API key format is already validated against this endpoint).
   Forces structured JSON via responseSchema so parsing never guesses. */
import { env } from "../env";

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

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
      // Disable extended thinking for snappy, cheap replies. Raise later if needed.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

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
