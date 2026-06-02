/* Read model for the web dashboard. Server-side only. */
import { db } from "./supabase";
import { todayISO } from "./time";

export interface DashboardData {
  today: string;
  tasks: { id: string; title: string; status: string; due_date: string | null; priority: string | null }[];
  expenses: { amount: number; item: string | null; category: string | null; spent_on: string }[];
  habitLogs: { habit: string; done_on: string }[];
  notes: { content: string; created_at: string }[];
  facts: { category: string | null; fact: string }[];
  profile: string;
}

export async function loadDashboard(): Promise<DashboardData> {
  const sb = db();
  const today = todayISO();
  const monthStart = today.slice(0, 8) + "01";
  const weekAgo = (() => {
    const d = new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().slice(0, 10);
  })();

  const [tasksRes, expRes, habitRes, notesRes, factsRes, profileRes] = await Promise.all([
    sb.from("tasks").select("id,title,status,due_date,priority").order("created_at", { ascending: false }).limit(100),
    sb.from("expenses").select("amount,item,category,spent_on").gte("spent_on", monthStart).order("spent_on", { ascending: false }).limit(200),
    sb.from("habit_logs").select("habit,done_on").gte("done_on", weekAgo).order("done_on", { ascending: false }).limit(200),
    sb.from("notes").select("content,created_at").order("created_at", { ascending: false }).limit(20),
    sb.from("memory_facts").select("category,fact").order("created_at", { ascending: false }).limit(50),
    sb.from("profile").select("content").limit(1),
  ]);

  return {
    today,
    tasks: tasksRes.data ?? [],
    expenses: expRes.data ?? [],
    habitLogs: habitRes.data ?? [],
    notes: notesRes.data ?? [],
    facts: factsRes.data ?? [],
    profile: profileRes.data?.[0]?.content ?? "",
  };
}
