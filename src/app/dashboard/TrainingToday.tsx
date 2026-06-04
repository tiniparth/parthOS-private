import { getPlan, sessionFor, describeSessionShort, isTrainingDay, addDaysISO, type PlanDay } from "@/lib/training";
import { todayISO } from "@/lib/time";
import { db } from "@/lib/supabase";
import TrainingCard from "./TrainingCard";

/** Compact Today | Tomorrow run card with a mark-done toggle. Shown on Today + Habits. */
export default async function TrainingToday() {
  const plan = await getPlan();
  if (!plan) return null;

  const today = todayISO();
  const t = sessionFor(plan, today);
  const tom = sessionFor(plan, addDaysISO(today, 1));
  if (!t && !tom) return null;

  let doneToday = false;
  try {
    const { data } = await db().from("habit_logs").select("id").eq("habit", "running").eq("done_on", today).limit(1);
    doneToday = !!(data && data.length);
  } catch { /* ignore */ }

  const col = (d: PlanDay | null) => (d ? { label: d.day, session: d.session, hint: describeSessionShort(d.session) } : null);

  return (
    <TrainingCard
      race={plan.race}
      raceDate={`race · ${plan.race_date}`}
      today={col(t)}
      tomorrow={col(tom)}
      canMark={!!t && isTrainingDay(t.session)}
      doneToday={doneToday}
    />
  );
}
