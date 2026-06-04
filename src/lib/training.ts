/* Marathon training plan — stored as JSON in settings(key='running_plan').
   Lets the morning brief, evening nudge, and brain read "today's / tomorrow's
   session". Update the plan by re-storing that settings row (see docs/notes). */
import { db } from "./supabase";

export interface PlanDay { week: string; day: string; session: string }
export interface Plan {
  race: string;
  race_date: string;
  updated?: string;
  by_date: Record<string, PlanDay>;
}

export async function getPlan(): Promise<Plan | null> {
  try {
    const { data } = await db().from("settings").select("value").eq("key", "running_plan").limit(1);
    const raw = data?.[0]?.value;
    if (!raw) return null;
    return JSON.parse(raw) as Plan;
  } catch (e) {
    console.error("getPlan failed:", e);
    return null;
  }
}

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function sessionFor(plan: Plan | null, dateISO: string): PlanDay | null {
  return plan?.by_date?.[dateISO] ?? null;
}

/** A session that actually involves moving (anything except a rest day). */
export function isTrainingDay(session?: string | null): boolean {
  if (!session) return false;
  const s = session.trim().toLowerCase();
  return s !== "rest" && s !== "full rest";
}

/** All sessions in the same plan-week as dateISO, sorted by date. */
export function weekSessions(plan: Plan | null, dateISO: string): (PlanDay & { date: string })[] {
  if (!plan) return [];
  const t = plan.by_date[dateISO];
  if (!t) return [];
  return Object.entries(plan.by_date)
    .filter(([, v]) => v.week === t.week)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Did Parth log a run on this date? (habit logs use 'running'.) */
export function ranOn(habitLogs: { habit: string; done_on: string }[], dateISO: string): boolean {
  return habitLogs.some((h) => /run/i.test(h.habit) && h.done_on === dateISO);
}
