/* Memory + persistence layer. Loads Parth's context for the brain, and
   executes the actions the brain returns. All DB access is server-side. */
import { db } from "./supabase";
import { env } from "./env";
import { todayISO } from "./time";
import { createEvent } from "./calendar";
import type { Action } from "./types";

export { todayISO };

export interface Context {
  profile: string;
  facts: { category: string | null; fact: string }[];
  openTasks: { title: string; due_date: string | null; priority: string | null }[];
  expenses: { amount: number; item: string | null; category: string | null; spent_on: string }[];
  habitLogs: { habit: string; done_on: string }[];
  today: string; // IST date YYYY-MM-DD
  model: string;
}

function daysAgoISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function loadContext(): Promise<Context> {
  const sb = db();
  const today = todayISO();
  const monthStart = today.slice(0, 8) + "01";
  const weekAgo = daysAgoISO(today, 7);

  const [profileRes, factsRes, tasksRes, modelRes, expRes, habitRes] = await Promise.all([
    sb.from("profile").select("content").limit(1),
    sb.from("memory_facts").select("category,fact").order("created_at", { ascending: false }).limit(50),
    sb.from("tasks").select("title,due_date,priority").eq("status", "open").order("created_at", { ascending: false }).limit(30),
    sb.from("settings").select("value").eq("key", "model").limit(1),
    sb.from("expenses").select("amount,item,category,spent_on").gte("spent_on", monthStart).order("spent_on", { ascending: false }).limit(100),
    sb.from("habit_logs").select("habit,done_on").gte("done_on", weekAgo).order("done_on", { ascending: false }).limit(100),
  ]);
  return {
    profile: profileRes.data?.[0]?.content ?? "",
    facts: factsRes.data ?? [],
    openTasks: tasksRes.data ?? [],
    expenses: expRes.data ?? [],
    habitLogs: habitRes.data ?? [],
    today,
    // settings table may not exist yet → modelRes.error → fall back to env default.
    model: modelRes.data?.[0]?.value || env.geminiModel(),
  };
}

/** Log every inbound message for audit/replay. */
export async function logCapture(kind: "text" | "voice", raw: string, meta: unknown) {
  await db().from("captures").insert({ kind, raw, meta });
}

/** Execute the brain's actions against the DB. Returns a short summary list. */
export async function executeActions(actions: Action[]): Promise<string[]> {
  const sb = db();
  const done: string[] = [];
  const cap = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);
  for (const raw of actions) {
    // Be tolerant: the model occasionally puts the payload in a sibling field.
    const a = raw as any;
    if (a.type === "create_task") {
      const title = a.title || a.content || a.fact;
      if (!title) continue;
      // Safety net against runaway generation.
      await sb.from("tasks").insert({
        title: cap(title, 250),
        due_date: a.due_date || null,
        priority: a.priority || null,
      });
      done.push(`task: ${cap(title, 60)}`);
    } else if (a.type === "create_note") {
      const content = a.content || a.title || a.fact;
      if (!content) continue;
      await sb.from("notes").insert({ content: cap(content, 4000), tags: a.tags ?? null });
      done.push("note saved");
    } else if (a.type === "remember_fact") {
      const fact = a.fact || a.content || a.title;
      if (!fact) continue;
      await sb.from("memory_facts").insert({ category: a.category ?? null, fact: cap(fact, 1000) });
      done.push("fact remembered");
    } else if (a.type === "log_expense") {
      const amount = Number(a.amount);
      if (!amount || Number.isNaN(amount)) continue;
      const row: Record<string, unknown> = {
        amount,
        item: a.item ? cap(String(a.item), 200) : null,
        category: a.category ? cap(String(a.category), 60) : null,
      };
      if (a.spent_on) row.spent_on = a.spent_on; // else DB defaults to today
      await sb.from("expenses").insert(row);
      done.push(`expense: ${amount}`);
    } else if (a.type === "log_habit") {
      const habit = a.habit || a.content || a.title;
      if (!habit) continue;
      const row: Record<string, unknown> = { habit: cap(String(habit), 50) };
      if (a.done_on) row.done_on = a.done_on;
      await sb.from("habit_logs").insert(row);
      done.push(`habit: ${habit}`);
    } else if (a.type === "create_event") {
      const summary = a.summary || a.title || "(event)";
      if (!a.when) continue;
      const ok = await createEvent(cap(String(summary), 200), String(a.when), Number(a.duration_min) || 30);
      done.push(ok ? `event: ${summary}` : "event (calendar not connected?)");
    }
  }
  return done;
}
