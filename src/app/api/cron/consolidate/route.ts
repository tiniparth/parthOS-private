import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase";
import { sendMessage } from "@/lib/telegram";
import { generateJSON } from "@/lib/brain/groq";
import { todayISO } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SCHEMA = {
  type: "object",
  properties: {
    facts: { type: "array", items: { type: "object", properties: { category: { type: "string" }, fact: { type: "string" } }, required: ["fact"] } },
    summary: { type: "string" },
  },
  required: ["facts", "summary"],
};

/** Weekly memory consolidation. Distills the week's captures into genuinely-new
    durable facts, saves them, and Telegrams Parth a summary. */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const sb = db();
  const today = todayISO();
  const weekAgo = (() => { const d = new Date(today + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 7); return d.toISOString(); })();

  const [capRes, profRes, factRes] = await Promise.all([
    sb.from("captures").select("raw").gte("created_at", weekAgo).order("created_at", { ascending: false }).limit(200),
    sb.from("profile").select("content").limit(1),
    sb.from("memory_facts").select("fact").order("created_at", { ascending: false }).limit(120),
  ]);
  const captures = (capRes.data ?? []).map((c) => c.raw).filter(Boolean);
  if (captures.length === 0) return NextResponse.json({ ok: true, note: "no captures this week" });

  const profile = profRes.data?.[0]?.content ?? "";
  const known = (factRes.data ?? []).map((f) => `- ${f.fact}`).join("\n");

  const sys = `You maintain Parth's long-term memory. From his messages this past week, extract genuinely NEW, durable facts about HIM — preferences, people, relationships, work changes, recurring patterns, life context — that are NOT already in the profile or known facts.
IGNORE one-off tasks, expenses, and events (those are tracked elsewhere). Only lasting things worth remembering. Max 8. If nothing new, return an empty list.
Also write a one-line "summary" of what you learned (or "Nothing new this week.").

WHO PARTH IS (profile):
${profile}

ALREADY-KNOWN FACTS:
${known || "(none)"}

Return JSON: {"facts":[{"category":"work|people|preference|personal","fact":"..."}],"summary":"..."}`;

  const out = await generateJSON(sys, [{ text: "This week's messages:\n" + captures.join("\n") }], SCHEMA);
  const facts = Array.isArray(out.facts) ? out.facts.slice(0, 8) : [];

  for (const f of facts) {
    if (f?.fact) await sb.from("memory_facts").insert({ category: f.category || null, fact: String(f.fact).slice(0, 500) });
  }

  const chatId = env.allowedChatId();
  if (chatId) {
    const body = facts.length
      ? `🧠 Weekly memory update\n\n${out.summary || ""}\n\nLearned & saved:\n${facts.map((f: any) => `• ${f.fact}`).join("\n")}`
      : `🧠 Weekly memory check — nothing new to add. ${out.summary || ""}`;
    await sendMessage(chatId, body);
  }
  return NextResponse.json({ ok: true, learned: facts.length });
}
