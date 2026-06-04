/* Builds Parth's morning briefing from his live data. Tries the brain for a
   warm, personalized phrasing; falls back to a plain format if that fails. */
import { loadContext } from "./memory";
import { generateJSON } from "./brain/groq";
import { isGmailConnected, triageInbox } from "./gmail";
import { googleConnected } from "./google";
import { listUpcoming } from "./calendar";
import { getPlan, sessionFor, isTrainingDay, ranOn, addDaysISO, describeSession } from "./training";

const TRACKED_HABITS = ["running", "reading", "yoga", "journalling"];

export async function buildBriefing(): Promise<string> {
  const ctx = await loadContext();

  // Email digest (only if connected).
  let mailLine = "(not connected)";
  try {
    if (await isGmailConnected()) {
      const high = (await triageInbox()).filter((m) => m.importance === "high");
      mailLine = high.length
        ? `${high.length} need attention — ${high.slice(0, 3).map((m) => m.subject).join("; ")}`
        : "nothing urgent";
    }
  } catch (e) {
    console.error("briefing mail failed:", e);
  }

  // Today's calendar — so the brief actually hands him his day.
  let scheduleLine = "(not connected)";
  try {
    if (await googleConnected()) {
      const events = await listUpcoming(0);
      scheduleLine = events.length
        ? events.map((e) => `${e.allDay ? "all day" : e.time} — ${e.summary}`).join("; ")
        : "nothing on the calendar today";
    }
  } catch (e) {
    console.error("briefing calendar failed:", e);
  }

  const dueToday = ctx.openTasks.filter((t) => t.due_date && t.due_date <= ctx.today);
  const otherTasks = ctx.openTasks.filter((t) => !(t.due_date && t.due_date <= ctx.today));

  const doneHabits = new Set(ctx.habitLogs.map((h) => h.habit.toLowerCase()));
  const missingHabits = TRACKED_HABITS.filter(
    (h) => ![...doneHabits].some((d) => d.includes(h))
  );

  const spendTotal = ctx.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  // Top client priority + the headline goal — so the brief feels strategic, not just a list.
  // Marathon plan: today's session + whether yesterday's run was logged.
  const plan = await getPlan();
  const todaySession = sessionFor(plan, ctx.today);
  const yISO = addDaysISO(ctx.today, -1);
  const ySession = sessionFor(plan, yISO);
  const missedYesterday = ySession && isTrainingDay(ySession.session) && !ranOn(ctx.habitLogs, yISO) ? ySession.session : null;
  const tomSession = sessionFor(plan, addDaysISO(ctx.today, 1));

  const topClient = ctx.clients.find((c) => c.priority === "high") || ctx.clients[0];
  const clientLine = topClient
    ? `${topClient.name}${topClient.stage ? ` [${topClient.stage}]` : ""}${topClient.next_action ? ` — next: ${topClient.next_action}` : ""}${topClient.blocker ? ` (blocker: ${topClient.blocker})` : ""}${topClient.last_contact ? ` · last contact ${topClient.last_contact}` : ""}`
    : "none";
  const goalLine = ctx.goals[0] ? `${ctx.goals[0].title}${ctx.goals[0].progress != null ? ` (${ctx.goals[0].progress}%)` : ""}` : "none";

  const data = `Date: ${ctx.today}
Today's training (Ladakh HM): ${todaySession ? `${todaySession.week} ${todaySession.day} — ${todaySession.session} → ${describeSession(todaySession.session)}` : "(no session / rest)"}
Tomorrow's training: ${tomSession ? `${tomSession.day} — ${tomSession.session} → ${describeSession(tomSession.session)}` : "(no session / rest)"}
Yesterday's session not logged (nudge if present): ${missedYesterday ? `${missedYesterday} on ${yISO}` : "n/a"}
Today's calendar: ${scheduleLine}
Tasks due/overdue: ${dueToday.map((t) => `${t.title}${t.due_date ? ` (${t.due_date})` : ""}`).join("; ") || "none"}
Other open tasks: ${otherTasks.slice(0, 6).map((t) => t.title).join("; ") || "none"}
Top client priority: ${clientLine}
Headline goal: ${goalLine}
Habits done in last 7 days: ${[...doneHabits].join(", ") || "none"}
Tracked habits slipping (nudge these): ${missingHabits.join(", ") || "all on track"}
Spend so far this month: INR ${spendTotal}
Inbox: ${mailLine}`;

  // Warm phrasing via the brain.
  try {
    const schema = { type: "object", properties: { briefing: { type: "string" } }, required: ["briefing"] };
    const sys = `You are Parth OS writing Parth's morning briefing — a sharp chief-of-staff who knows him. Use ONLY his data below; never invent.
Structure (5–8 short scannable lines, light emoji, no markdown headers, no rambling):
1. One-line warm good-morning.
2. 🗓️ Today's schedule (from the calendar line; if nothing, say the day's open).
3. 🎯 The 1–3 things that matter MOST today — due/overdue tasks + the top client's next action (his #1 work priority is closing Empower / Dr Jamal — surface it whenever relevant).
4. 🏃 Today's marathon training — show the session NAME *and* its how-to detail from the data (e.g. "Today's run: 20m tempo — 20 min comfortably-hard, ~10–15s/km slower than 10K, with warm-up + cool-down"). Rest day → say "rest day — recover". If yesterday's session wasn't logged, add a gentle one-line nudge.
5. 👟 One short "Tomorrow:" line with tomorrow's session (name + a few words) so he can plan ahead.
6. Optional one-liner: a slipping non-running habit, headline goal progress, or spend — only if notable.
Be direct and energizing — this should make his day easier, not just list data.`;
    const out = await generateJSON(sys, [{ text: data }], schema, ctx.model);
    if (out?.briefing) return String(out.briefing);
  } catch (e) {
    console.error("briefing brain failed, using plain format:", e);
  }

  // Deterministic fallback.
  const lines = ["🌅 Good morning, Parth!"];
  if (scheduleLine !== "(not connected)") lines.push(`🗓️ Today: ${scheduleLine}`);
  if (dueToday.length) lines.push(`📌 Due today: ${dueToday.map((t) => t.title).join(", ")}`);
  if (topClient) lines.push(`🎯 ${clientLine}`);
  if (todaySession) lines.push(`🏃 Today's run: ${todaySession.session} — ${describeSession(todaySession.session)}`);
  if (tomSession) lines.push(`👟 Tomorrow: ${tomSession.session}`);
  if (missedYesterday) lines.push(`⚠️ Yesterday's ${missedYesterday} isn't logged — did you do it?`);
  lines.push(`✅ Open tasks: ${ctx.openTasks.length}`);
  if (missingHabits.length) lines.push(`🏃 Habit nudge: ${missingHabits.join(", ")}`);
  lines.push(`💸 Spent this month: ₹${spendTotal}`);
  if (mailLine !== "(not connected)") lines.push(`📨 Inbox: ${mailLine}`);
  return lines.join("\n");
}
