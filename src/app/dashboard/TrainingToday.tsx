import { getPlan, sessionFor, describeSession, addDaysISO } from "@/lib/training";
import { todayISO } from "@/lib/time";

/** Today's (and tomorrow's) marathon session, with how-to detail — shown on the
    Habits page so the running plan is visible where Parth tracks discipline. */
export default async function TrainingToday() {
  const plan = await getPlan();
  if (!plan) return null;

  const today = todayISO();
  const t = sessionFor(plan, today);
  const tom = sessionFor(plan, addDaysISO(today, 1));
  if (!t && !tom) return null;

  return (
    <div className="mb-5 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          🏅 {plan.race}
        </span>
        <span className="text-xs text-muted-foreground">race · {plan.race_date}</span>
      </div>

      {t ? (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl">🏃</span>
            <span className="font-semibold">Today — {t.session}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{t.week} · {t.day}</span>
          </div>
          <p className="mt-1.5 pl-8 text-sm text-muted-foreground">{describeSession(t.session)}</p>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No session scheduled today.</div>
      )}

      {tom && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base">👟</span>
            <span className="text-sm"><span className="text-muted-foreground">Tomorrow ({tom.day}): </span><span className="font-medium">{tom.session}</span></span>
          </div>
          <p className="mt-1 pl-7 text-xs text-muted-foreground">{describeSession(tom.session)}</p>
        </div>
      )}
    </div>
  );
}
