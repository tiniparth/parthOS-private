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
  clients: { name: string; stage: string | null; next_action: string | null; blocker: string | null; contact: string | null; priority: string | null; last_contact: string | null }[];
  goals: { title: string; status: string | null; target_date: string | null; progress: number | null }[];
  people: { name: string; relationship: string | null; email: string | null; role: string | null; company: string | null; notes: string | null }[];
  journal: { entry: string; entry_date: string; mood: string | null }[];
  milestones: { title: string; kind: string | null; area: string | null; impact: string | null; happened_on: string }[];
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

  const [profileRes, factsRes, tasksRes, modelRes, expRes, habitRes, clientsRes, goalsRes, peopleRes, journalRes, milestonesRes] = await Promise.all([
    sb.from("profile").select("content").limit(1),
    sb.from("memory_facts").select("category,fact").order("created_at", { ascending: false }).limit(50),
    sb.from("tasks").select("title,due_date,priority").eq("status", "open").order("created_at", { ascending: false }).limit(30),
    sb.from("settings").select("value").eq("key", "model").limit(1),
    sb.from("expenses").select("amount,item,category,spent_on").gte("spent_on", monthStart).order("spent_on", { ascending: false }).limit(100),
    sb.from("habit_logs").select("habit,done_on").gte("done_on", weekAgo).order("done_on", { ascending: false }).limit(100),
    sb.from("clients").select("name,stage,next_action,blocker,contact,priority,last_contact").order("updated_at", { ascending: false }).limit(30),
    sb.from("goals").select("title,status,target_date,progress").eq("status", "active").order("created_at", { ascending: false }).limit(20),
    sb.from("people").select("name,relationship,email,role,company,notes").order("updated_at", { ascending: false }).limit(40),
    sb.from("journal").select("entry,entry_date,mood").order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(12),
    sb.from("milestones").select("title,kind,area,impact,happened_on").order("happened_on", { ascending: false }).limit(20),
  ]);
  return {
    profile: profileRes.data?.[0]?.content ?? "",
    facts: factsRes.data ?? [],
    openTasks: tasksRes.data ?? [],
    expenses: expRes.data ?? [],
    habitLogs: habitRes.data ?? [],
    clients: clientsRes.data ?? [],
    goals: goalsRes.data ?? [],
    people: peopleRes.data ?? [],
    journal: journalRes.data ?? [],
    milestones: milestonesRes.data ?? [],
    today,
    // settings table may not exist yet → modelRes.error → fall back to env default.
    model: modelRes.data?.[0]?.value || env.brainModel(),
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
  const KNOWN = ["create_task", "journal", "create_note", "remember_fact", "log_expense", "log_habit", "create_event", "log_milestone"];
  // Some models (e.g. Llama via Groq) nest fields under the type name:
  // { create_event: {...} } instead of { type:"create_event", ... }. Flatten that.
  const normalize = (raw: any): any => {
    if (raw && typeof raw === "object" && !raw.type) {
      for (const k of KNOWN) if (raw[k] && typeof raw[k] === "object") return { type: k, ...raw[k] };
    }
    return raw;
  };
  for (const rawAction of actions) {
    const a = normalize(rawAction) as any;
    if (a.type === "create_task") {
      let title = a.title || a.content || a.fact;
      if (!title) continue;
      let dueDate = a.due_date || null;
      // Backstop: if the brain baked a date into the title instead of the
      // due_date field (e.g. "… — due 2026-06-04"), salvage it.
      const m = title.match(/\s*[—\-–]\s*due\s+(\d{4}-\d{2}-\d{2})\s*$/i);
      if (m) {
        if (!dueDate) dueDate = m[1];
        title = title.slice(0, m.index).trim();
      }
      // Safety net against runaway generation.
      await sb.from("tasks").insert({
        title: cap(title, 250),
        due_date: dueDate,
        priority: a.priority || null,
      });
      done.push(`task: ${cap(title, 60)}`);
    } else if (a.type === "journal" || a.type === "create_note") {
      // Single free-form home: everything free-form goes to the journal (notes retired).
      const entry = a.content || a.title || a.fact;
      if (!entry) continue;
      const row: Record<string, unknown> = { entry: cap(entry, 8000) };
      if (a.mood) row.mood = cap(String(a.mood), 40);
      await sb.from("journal").insert(row); // entry_date defaults to today in the DB
      done.push("journalled");
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
      const attendees = Array.isArray(a.attendees) ? a.attendees.map((x: any) => String(x)) : [];
      const r = await createEvent(cap(String(summary), 200), String(a.when), Number(a.duration_min) || 30, attendees);
      if (r.ok) {
        let line = `event: ${summary}${attendees.length ? ` (+${attendees.length} invited)` : ""}`;
        if (r.meetLink) line += ` 🔗 ${r.meetLink}`;
        else if (attendees.length) line += ` ⚠️ no Meet link attached`;
        done.push(line);
      } else {
        done.push("event (calendar not connected?)");
      }
    } else if (a.type === "log_milestone") {
      const title = a.title || a.content || a.fact;
      if (!title) continue;
      const row: Record<string, unknown> = {
        title: cap(String(title), 200),
        kind: a.kind ? cap(String(a.kind), 30) : null,
        area: a.area ? cap(String(a.area), 30) : null,
        detail: a.detail ? cap(String(a.detail), 1000) : null,
        impact: a.impact ? cap(String(a.impact), 500) : null,
      };
      if (a.happened_on) row.happened_on = a.happened_on; // else DB defaults to today
      await sb.from("milestones").insert(row);
      done.push(`milestone: ${cap(String(title), 60)}`);
    }
  }
  return done;
}
