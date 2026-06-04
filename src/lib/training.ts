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

/** Turn a terse plan label ("20m tempo", "5×3m intervals") into actionable guidance. */
export function describeSession(session: string): string {
  if (!session) return "";
  const s = session.toLowerCase();
  const km = s.match(/(\d+)\s*km/);
  const reps = s.match(/(\d+)\s*[×x]\s*(\d+)\s*m/);
  const tmin = s.match(/(\d+)\s*m\s*tempo/);

  if (/race day/.test(s)) return "🏁 Race day — easy start, settle into rhythm, negative-split if you can. Trust the training.";
  if (/full rest/.test(s)) return "Full rest — no running. Sleep well, hydrate, light stretch/mobility.";
  if (/\brest\b/.test(s)) return "Rest day — let the legs recover; optional easy walk or mobility.";
  if (/long run/.test(s)) return `${km ? km[1] + " km " : ""}easy long run at conversational pace (able to talk in full sentences). Fuel + hydrate after.`;
  if (/recovery jog/.test(s)) return "Very easy recovery jog, 20–30 min — deliberately slow.";
  if (/recovery/.test(s)) return "Easy recovery, ~25–35 min at low effort.";
  if (/hill/.test(s)) return "Hill work: 6–8 × 60–90s uphill hard, jog down to recover. 10-min warm-up + cool-down.";
  if (/intervals/.test(s)) return reps
    ? `${reps[1]} × ${reps[2]} min hard (~5K effort), ~90s easy jog between reps. 10-min warm-up + cool-down.`
    : "Intervals: ~5 × 3 min hard with 90s jog recovery. Warm up & cool down 10 min.";
  if (/progression tempo/.test(s)) return "Progression run: start easy, finish the last third at comfortably-hard tempo.";
  if (/tempo/.test(s)) return `${tmin ? tmin[1] + "-min " : ""}tempo at comfortably-hard pace (~10–15s/km slower than 10K pace). 10-min easy warm-up + cool-down.`;
  if (/easy.*strength/.test(s)) return "Easy 30–40 min run + 20 min strength (core, glutes, single-leg).";
  if (/strides/.test(s)) return "Easy run finished with 4–6 × ~20s strides (relaxed, smooth accelerations).";
  if (/pickups/.test(s)) return "Easy run with 3 × 2 min pickups (controlled surges).";
  if (/shakeout/.test(s)) return "Short, very easy shakeout jog to stay loose.";
  if (/easy/.test(s)) return `Easy run${km ? ` (${km[1]} km)` : ""} at relaxed, conversational effort.`;
  if (/strength/.test(s)) return "Strength — core, legs, mobility.";
  return session;
}
