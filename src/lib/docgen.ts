/* Generate a structured document (HTML) on a topic, via Groq.
   Uses gpt-oss-120b (no live web on free tier — draws on model knowledge). */
import { env } from "./env";

export async function generateDoc(topic: string): Promise<{ title: string; html: string }> {
  const sys =
    "You are a sharp research & writing assistant for Parth (founding member at Workwise, an AI-native EPC procurement platform). " +
    "Produce a professional, well-structured document on the requested topic as clean HTML. " +
    "Start with an <h1> title, then <h2> sections, with <p>, <ul><li>, and <table> where useful. " +
    "Be substantive, organized, and concise. If you're unsure of a current fact, say so rather than inventing it. " +
    "Output ONLY HTML — no markdown, no code fences, no commentary before or after.";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.groqKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      temperature: 0.5,
      max_tokens: 3500,
      messages: [{ role: "system", content: sys }, { role: "user", content: topic }],
    }),
  });
  if (!res.ok) throw new Error(`docgen ${res.status}: ${await res.text()}`);
  const j = await res.json();
  let html = (j.choices?.[0]?.message?.content || "").trim().replace(/^```html/i, "").replace(/```$/, "").trim();
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = (m ? m[1].replace(/<[^>]+>/g, "") : topic).trim().slice(0, 120) || "Document";
  return { title, html };
}
