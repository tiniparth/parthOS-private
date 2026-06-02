/* Memory + persistence layer. Loads Parth's context for the brain, and
   executes the actions the brain returns. All DB access is server-side. */
import { db } from "./supabase";
import type { Action } from "./types";

export interface Context {
  profile: string;
  facts: { category: string | null; fact: string }[];
  openTasks: { title: string; due_date: string | null; priority: string | null }[];
}

export async function loadContext(): Promise<Context> {
  const sb = db();
  const [profileRes, factsRes, tasksRes] = await Promise.all([
    sb.from("profile").select("content").limit(1),
    sb.from("memory_facts").select("category,fact").order("created_at", { ascending: false }).limit(50),
    sb.from("tasks").select("title,due_date,priority").eq("status", "open").order("created_at", { ascending: false }).limit(30),
  ]);
  return {
    profile: profileRes.data?.[0]?.content ?? "",
    facts: factsRes.data ?? [],
    openTasks: tasksRes.data ?? [],
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
  for (const raw of actions) {
    // Be tolerant: the model occasionally puts the payload in a sibling field.
    const a = raw as any;
    if (a.type === "create_task") {
      const title = a.title || a.content || a.fact;
      if (!title) continue;
      await sb.from("tasks").insert({
        title,
        due_date: a.due_date || null,
        priority: a.priority || null,
      });
      done.push(`task: ${title}`);
    } else if (a.type === "create_note") {
      const content = a.content || a.title || a.fact;
      if (!content) continue;
      await sb.from("notes").insert({ content, tags: a.tags ?? null });
      done.push("note saved");
    } else if (a.type === "remember_fact") {
      const fact = a.fact || a.content || a.title;
      if (!fact) continue;
      await sb.from("memory_facts").insert({ category: a.category ?? null, fact });
      done.push("fact remembered");
    }
  }
  return done;
}
