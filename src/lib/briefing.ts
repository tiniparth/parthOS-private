/* Builds Parth's morning briefing from his live data. Tries the brain for a
   warm, personalized phrasing; falls back to a plain format if that fails. */
import { loadContext } from "./memory";
import { generateJSON } from "./brain/gemini";

const TRACKED_HABITS = ["running", "reading", "yoga", "journalling"];

export async function buildBriefing(): Promise<string> {
  const ctx = await loadContext();

  const dueToday = ctx.openTasks.filter((t) => t.due_date && t.due_date <= ctx.today);
  const otherTasks = ctx.openTasks.filter((t) => !(t.due_date && t.due_date <= ctx.today));

  const doneHabits = new Set(ctx.habitLogs.map((h) => h.habit.toLowerCase()));
  const missingHabits = TRACKED_HABITS.filter(
    (h) => ![...doneHabits].some((d) => d.includes(h))
  );

  const spendTotal = ctx.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const data = `Date: ${ctx.today}
Tasks due/overdue: ${dueToday.map((t) => `${t.title}${t.due_date ? ` (${t.due_date})` : ""}`).join("; ") || "none"}
Other open tasks: ${otherTasks.slice(0, 6).map((t) => t.title).join("; ") || "none"}
Habits done in last 7 days: ${[...doneHabits].join(", ") || "none"}
Tracked habits not done recently (nudge these): ${missingHabits.join(", ") || "all on track"}
Spend so far this month: INR ${spendTotal}`;

  // Warm phrasing via the brain.
  try {
    const schema = { type: "object", properties: { briefing: { type: "string" } }, required: ["briefing"] };
    const sys = `You are Parth OS writing Parth's short morning briefing. Tone: warm, concise, motivating — a sharp chief-of-staff who knows him. Use his data below. 4–7 short lines. Open with a friendly good-morning, surface what matters today (his #1 work priority is closing Empower), and end with ONE gentle habit nudge. Plain text, light emoji ok, no markdown headers, no rambling.`;
    const out = await generateJSON(sys, [{ text: data }], schema, ctx.model);
    if (out?.briefing) return String(out.briefing);
  } catch (e) {
    console.error("briefing brain failed, using plain format:", e);
  }

  // Deterministic fallback.
  const lines = ["🌅 Good morning, Parth!"];
  if (dueToday.length) lines.push(`📌 Due today: ${dueToday.map((t) => t.title).join(", ")}`);
  lines.push(`✅ Open tasks: ${ctx.openTasks.length}`);
  if (missingHabits.length) lines.push(`🏃 Habit nudge: ${missingHabits.join(", ")}`);
  lines.push(`💸 Spent this month: ₹${spendTotal}`);
  return lines.join("\n");
}
