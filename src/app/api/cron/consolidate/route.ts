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
  const captures = (capRes.data ?? [])
    .map((c) => c.raw)
    .filter(Boolean)
    .filter((r: string) => !/sanitycheck|diagnostic|claude (live )?test|ping from claude|whats my (top|single)/i.test(r));
  if (captures.length === 0) return NextResponse.json({ ok: true, note: "no captures this week" });

  const profile = profRes.data?.[0]?.content ?? "";
  const known = (factRes.data ?? []).map((f) => `- ${f.fact}`).join("\n");

  const sys = `You curate Parth's long-term memory. From his messages this past week, extract ONLY genuinely NEW, TIMELESS facts about HIM that aren't already known.

A durable fact is true regardless of any date — a relationship ("works with Prince on the INA prototype"), a role, a stable preference ("prefers morning calls"), a lasting life/work context.

STRICTLY REJECT (do NOT extract) anything that is:
- tied to a specific time or date, or contains "tomorrow / at 3pm / on June X" → that's a scheduled event, NOT a fact
- a one-off task, to-do, reminder, expense, or meeting
- a test / diagnostic / system message
- already present in the profile or known facts below
When in doubt, leave it out. Max 6 facts. An empty list is a perfectly good answer.
Write a one-line "summary" of what (if anything) you learned.

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

  // --- Weekly "week in review" digest. Reads the week's real activity and writes
  //     a narrative to `digests` automatically — the spine of future retrospectives. ---
  const weekStart = weekAgo.slice(0, 10);
  let digestSummary = "";
  try {
    const [doneRes, mileRes, habRes, expRes] = await Promise.all([
      sb.from("tasks").select("title,done_at").eq("status", "done").gte("done_at", weekAgo).order("done_at", { ascending: false }).limit(100),
      sb.from("milestones").select("kind,area,title,impact,happened_on").gte("happened_on", weekStart).order("happened_on", { ascending: false }).limit(50),
      sb.from("habit_logs").select("habit").gte("done_on", weekStart).limit(300),
      sb.from("expenses").select("amount").gte("spent_on", weekStart).limit(500),
    ]);
    const doneTasks = (doneRes.data ?? []).map((t) => `- ${t.title}`).join("\n") || "(none completed)";
    const milestones = (mileRes.data ?? []).map((m: any) => `- [${m.kind || "milestone"}/${m.area || "?"}] ${m.title}${m.impact ? ` — ${m.impact}` : ""}`).join("\n") || "(none logged)";
    const habitCounts: Record<string, number> = {};
    for (const h of habRes.data ?? []) habitCounts[h.habit] = (habitCounts[h.habit] || 0) + 1;
    const habitStr = Object.entries(habitCounts).map(([h, n]) => `${h} ×${n}`).join(", ") || "(none)";
    const spendTotal = (expRes.data ?? []).reduce((s, e) => s + Number(e.amount || 0), 0);

    const digestSys = `You write a tight WEEK IN REVIEW for Parth — factual, specific, in HIS voice as accomplishments (for a future appraisal/resume/ISB record). Use ONLY the data given; do not invent. 4-7 lines max. Lead with what he SHIPPED/WON/ACHIEVED, then meaningful progress, then a one-line note on habits/spend if notable. No fluff, no praise-padding. If a week was quiet, say so honestly and briefly.
Return JSON: {"summary":"the narrative paragraph/bullets","highlights":["3-6 crisp resume-style bullets of the week's real wins"]}`;
    const digestUser = `Week ${weekStart} → ${today}.
MILESTONES LOGGED:
${milestones}
TASKS COMPLETED:
${doneTasks}
HABITS: ${habitStr}
SPEND THIS WEEK: ₹${spendTotal}
THIS WEEK'S MESSAGES (context):
${captures.slice(0, 120).join("\n")}`;

    const DIGEST_SCHEMA = { type: "object", properties: { summary: { type: "string" }, highlights: { type: "array", items: { type: "string" } } }, required: ["summary"] };
    const dout = await generateJSON(digestSys, [{ text: digestUser }], DIGEST_SCHEMA);
    digestSummary = String(dout.summary || "").slice(0, 4000);
    if (digestSummary) {
      await sb.from("digests").insert({
        period: "week",
        period_start: weekStart,
        period_end: today,
        summary: digestSummary,
        highlights: Array.isArray(dout.highlights) ? dout.highlights.slice(0, 8) : null,
      });
    }
  } catch (e) {
    console.error("weekly digest failed:", e);
  }

  const chatId = env.allowedChatId();
  if (chatId) {
    const memoryPart = facts.length
      ? `🧠 Weekly memory update\n\n${out.summary || ""}\n\nLearned & saved:\n${facts.map((f: any) => `• ${f.fact}`).join("\n")}`
      : `🧠 Weekly memory check — nothing new to add. ${out.summary || ""}`;
    const reviewPart = digestSummary ? `\n\n📅 Week in review\n\n${digestSummary}` : "";
    await sendMessage(chatId, memoryPart + reviewPart);
  }
  return NextResponse.json({ ok: true, learned: facts.length, digest: !!digestSummary });
}
