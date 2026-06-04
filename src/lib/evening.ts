/* Evening nudge: tomorrow's training session (so Parth can prep) + a check on
   whether today's session got logged. Sent ~9pm IST by the evening cron. */
import { loadContext } from "./memory";
import { getPlan, sessionFor, isTrainingDay, ranOn, addDaysISO } from "./training";

export async function buildEvening(): Promise<string | null> {
  const ctx = await loadContext();
  const plan = await getPlan();
  if (!plan) return null;

  const today = sessionFor(plan, ctx.today);
  const tom = sessionFor(plan, addDaysISO(ctx.today, 1));
  const ranToday = ranOn(ctx.habitLogs, ctx.today);
  const missedToday = !!today && isTrainingDay(today.session) && !ranToday;

  const lines: string[] = ["🌙 Evening check, Parth."];

  // Today's accountability.
  if (missedToday) lines.push(`⚠️ Today's ${today!.session} isn't logged yet — squeeze it in, or log it if you did it.`);
  else if (today && isTrainingDay(today.session) && ranToday) lines.push(`✅ Today's ${today.session} — done. Nice.`);

  // Tomorrow's session + prep cue.
  if (tom) {
    if (/race day/i.test(tom.session)) {
      lines.push(`🏁 Tomorrow is RACE DAY — ${tom.session}. Lay out your kit, sleep early, trust the training.`);
    } else if (isTrainingDay(tom.session)) {
      lines.push(`🏃 Tomorrow (${tom.day}): ${tom.session}.`);
      if (/long run/i.test(tom.session)) lines.push("Big one — hydrate today, eat well, sleep early, and lay your kit out tonight.");
    } else {
      lines.push(`😴 Tomorrow (${tom.day}): ${tom.session} — recover well.`);
    }
  }

  // Nothing worth pinging about.
  if (lines.length <= 1) return null;
  return lines.join("\n");
}
