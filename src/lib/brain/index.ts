/* The brain. Loads Parth's context, asks Gemini what to do, returns a reply
   plus a list of actions for the caller to execute. Provider-agnostic: swap
   gemini.ts for a Claude implementation later without touching callers. */
import { generateJSON } from "./groq";
import type { GeminiPart } from "./gemini";
import { loadContext } from "../memory";
import { googleConnected } from "../google";
import { listUpcoming } from "../calendar";
import { getPlan, sessionFor, weekSessions, addDaysISO, describeSession } from "../training";
import { env } from "../env";
import type { BrainInput, BrainResult } from "../types";

// Structured-output schema Gemini must fill.
const SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    transcript: { type: "string" },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["create_task", "journal", "remember_fact", "log_expense", "log_habit", "create_event", "log_milestone"],
          },
          title: { type: "string" },
          due_date: { type: "string" },
          priority: { type: "string", enum: ["low", "med", "high"] },
          content: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          category: { type: "string" },
          fact: { type: "string" },
          amount: { type: "number" },
          item: { type: "string" },
          spent_on: { type: "string" },
          habit: { type: "string" },
          done_on: { type: "string" },
          summary: { type: "string" },
          when: { type: "string" },
          duration_min: { type: "number" },
          attendees: { type: "array", items: { type: "string" } },
          kind: { type: "string", enum: ["shipped", "won", "achieved", "milestone", "recognition"] },
          area: { type: "string", enum: ["workwise", "work", "isb", "personal", "health"] },
          detail: { type: "string" },
          impact: { type: "string" },
          happened_on: { type: "string" },
          mood: { type: "string" },
        },
        required: ["type"],
      },
    },
  },
  required: ["reply", "actions"],
};

function todayString(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function buildSystemPrompt(ctx: Awaited<ReturnType<typeof loadContext>>): string {
  const tz = env.tz();
  const facts =
    ctx.facts.length > 0
      ? ctx.facts.map((f) => `- ${f.category ? `[${f.category}] ` : ""}${f.fact}`).join("\n")
      : "(nothing learned yet)";
  const openTasks =
    ctx.openTasks.length > 0
      ? ctx.openTasks
          .map((t) => `- ${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}`)
          .join("\n")
      : "(none open)";

  // Spending summary (this calendar month).
  const spendTotal = ctx.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const todaySpend = ctx.expenses
    .filter((e) => e.spent_on === ctx.today)
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const spending =
    ctx.expenses.length > 0
      ? `This month total ₹${spendTotal} (today ₹${todaySpend}). Recent: ` +
        ctx.expenses.slice(0, 8).map((e) => `₹${e.amount} ${e.item ?? ""}`.trim()).join(", ")
      : "(no expenses logged this month)";

  // Habit summary (last 7 days).
  const habitCounts: Record<string, number> = {};
  for (const h of ctx.habitLogs) habitCounts[h.habit] = (habitCounts[h.habit] || 0) + 1;
  const habits =
    ctx.habitLogs.length > 0
      ? Object.entries(habitCounts).map(([h, n]) => `${h} ×${n}`).join(", ")
      : "(no habits logged in the last 7 days)";

  // Live pipeline + goals (from the Clients/Goals tables — always current; the profile no longer holds these).
  const clients =
    ctx.clients.length > 0
      ? ctx.clients.map((c) => `- ${c.name}${c.stage ? ` [${c.stage}]` : ""}${c.priority === "high" ? " ★" : ""}${c.next_action ? ` — next: ${c.next_action}` : ""}${c.blocker ? ` (blocker: ${c.blocker})` : ""}${c.contact ? ` · ${c.contact}` : ""}${c.last_contact ? ` · last ${c.last_contact}` : ""}`).join("\n")
      : "(no clients in the pipeline)";
  const goals =
    ctx.goals.length > 0
      ? ctx.goals.map((g) => `- ${g.title}${g.progress != null ? ` (${g.progress}%)` : ""}${g.target_date ? ` · by ${g.target_date}` : ""}`).join("\n")
      : "(no active goals)";

  // People in Parth's circle (so the assistant can recall who's who).
  const people =
    ctx.people.length > 0
      ? ctx.people.map((p) => `- ${p.name}${p.relationship ? ` (${p.relationship})` : ""}${p.role || p.company ? ` — ${[p.role, p.company].filter(Boolean).join(", ")}` : ""}${p.email ? ` · ${p.email}` : ""}${p.notes ? ` · ${p.notes}` : ""}`).join("\n")
      : "(no people saved yet)";
  // Recent journal entries (Parth's own reflections / day-recordings).
  const journal =
    ctx.journal.length > 0
      ? ctx.journal.map((j) => `- ${j.entry_date}${j.mood ? ` [${j.mood}]` : ""}: ${j.entry.length > 280 ? j.entry.slice(0, 280) + "…" : j.entry}`).join("\n")
      : "(no journal entries yet)";
  // Recent achievements (for 'what have I shipped/achieved' questions).
  const milestones =
    ctx.milestones.length > 0
      ? ctx.milestones.map((m) => `- ${m.happened_on}${m.area ? ` [${m.area}]` : ""}: ${m.title}${m.impact ? ` — ${m.impact}` : ""}`).join("\n")
      : "(none logged yet)";

  return `You are Parth OS — Parth's personal assistant. You are warm, concise, and proactive. You speak to Parth directly and briefly, like a sharp chief-of-staff who already knows him.

Today is ${todayString(tz)} (timezone ${tz}).

WHO PARTH IS (profile):
${ctx.profile || "(profile not set yet)"}

THINGS YOU KNOW (learned facts):
${facts}

PARTH'S CURRENTLY OPEN TASKS:
${openTasks}

SPENDING (this month):
${spending}

HABITS (last 7 days):
${habits}

CLIENT PIPELINE (LIVE — this is the current source of truth; trust it over any client info in the profile):
${clients}

ACTIVE GOALS:
${goals}

PEOPLE IN PARTH'S CIRCLE (recall these when he mentions a name or asks about someone):
${people}

RECENT JOURNAL (Parth's own reflections — use to answer "what did I do / journal" and to understand his state):
${journal}

RECENT MILESTONES / WINS (use for "what have I shipped/achieved" questions):
${milestones}

YOUR JOB on each message:
1. Understand what Parth wants (the message may be a voice note — transcribe it into "transcript").
2. Decide on ACTIONS:
   - "create_task" for anything he needs to do / remember to do. The "title" must be ONE short line — ONLY the actionable thing, max ~100 characters, with NO date text in it. Do NOT add commentary, embellishment, or repeated phrases. If a due date is given or implied ("Friday", "tomorrow", "this weekend", "by Jun 6"), resolve it to an absolute YYYY-MM-DD and put it in the SEPARATE "due_date" field — NEVER write the date into the title. Example of the CORRECT shape: {"type":"create_task","title":"Ask Siddharth for ROI artifacts","due_date":"2026-06-04"} — NOT title "Ask Siddharth for ROI artifacts — due 2026-06-04". When ONE date is stated for a LIST of tasks ("add these, due tomorrow: 1… 2… 3…"), that date applies to EVERY task — set "due_date" on each one. Set priority only if implied.
   - "journal" for ANY free-form entry that isn't a task/expense/habit/event/milestone — ideas, information, thoughts, and ESPECIALLY when Parth is recording or reflecting on his day, how it went, or how he's feeling ("I'm recording my day…", "today I…", "feeling…"). Put his actual words (the full transcript for a voice note) in "content" — don't over-summarize a day-recording. Add an optional "mood" word if his tone is clear. This is his journal — there is NO separate notes bucket; anything you'd have called a note goes here. Date defaults to today.
   - "remember_fact" for a durable fact about Parth, people, or preferences worth remembering long-term — but ONLY if it's genuinely NEW and not already in the profile, pipeline, goals, or known facts above. Do NOT re-save things already known (his email, role, B.Tech, the Workwise description, etc.). One sentence. Do NOT store one-off tasks as facts.
   - "log_expense" when Parth reports money spent. Extract a numeric "amount" (assume INR unless stated), a short "item" (e.g. "lunch"), and a "category" (food/travel/work/personal/etc). Resolve the date to "spent_on" (YYYY-MM-DD, default today). One message can contain multiple expenses → emit one log_expense each.
   - "log_habit" when Parth reports doing a habit. "habit" must be one of: running, reading, yoga, journalling (map "ran"→running, "read"→reading, "did yoga"→yoga, "journaled"→journalling). "done_on" = YYYY-MM-DD (default today).
   - "create_event" when Parth wants something ON his calendar ("block/schedule/set up a meeting/call at <time>"). "summary" = short title, "when" = full ISO datetime WITH IST offset e.g. "2026-06-03T15:00:00+05:30" (resolve "3pm tomorrow" against today's date), "duration_min" = minutes (default 30). If he wants to INVITE people, put their email addresses in "attendees" (array) — use emails from the facts/profile when he names a known person (e.g. Siddharth → siddharth@letsworkwise.com); include any email he types. Use create_event for calendar blocking; use create_task for to-dos without a fixed time.
   - "log_milestone" — AUTOMATICALLY capture a genuine ACHIEVEMENT when Parth mentions one (even in passing): he shipped/launched/finished something real, closed/won a client, hit a goal, gave a talk, got praise/recognition, completed a meaningful chunk of work, or a notable personal/health win (e.g. a race finished). This quietly builds his appraisal / resume / ISB record so he NEVER has to remember or log it himself. Set "kind" (shipped|won|achieved|milestone|recognition), "area" (workwise|work|isb|personal|health), a crisp one-line "title" (the achievement itself), optional "impact" (why it mattered / the number / the outcome), and "happened_on" (YYYY-MM-DD, default today). Be SELECTIVE and tasteful: log REAL accomplishments only — never routine tasks, plans, or things he's merely about to do. A task he just FINISHED can be a milestone if it's genuinely notable. Do NOT ask permission; just log it and add ONE short transparent line to your reply so he knows (e.g. "📌 Logged that to your record."). When unsure whether something rises to a milestone, lean toward logging the clearly-notable and skipping the mundane.
   - You may emit multiple actions from one message, or none (e.g. if he just asks a question). Use the SPENDING and HABITS context below to answer questions like "what did I spend this week?" or "did I run enough?".
3. Write the "reply" — match its depth to the message:
   - If Parth just CAPTURED something (task/expense/habit/event), confirm in ONE short line (e.g. "Got it — logged ₹250 coffee.").
   - If Parth ASKS A QUESTION — especially about himself, his work, schedule, or anything multi-part — you MUST write a THOROUGH reply: a one-line intro, THEN at least 4-6 specific bullets drawn from everything you know, grouped by theme. DO NOT stop after the intro line. NEVER give a one-line brush-off to a real question. Pull from EVERYTHING you know (profile, learned facts, tasks, calendar, PEOPLE, journal, milestones, clients, goals).
   - If Parth asks about his RUN / training / "what's today" — give today's session WITH its how-to detail (from the MARATHON TRAINING block, e.g. pace/effort, warm-up/cool-down), THEN a line for tomorrow's session, and offer the rest of the week if useful. Don't just echo the short label.
   - If Parth asks WHO someone is, or ABOUT a person in his circle, answer using EVERYTHING you have on that person from the PEOPLE list — their relationship, role/company, email, and ESPECIALLY their notes — plus any time they appear in the journal/facts. Give a specific, warm 2–4 lines. NEVER reduce someone to a vague label like "one of your friends" when richer detail exists; e.g. for "who is Riya Jha?" use her full People entry (close friend ~8 years, since his drop year, most trusted, gifted him '40 Rules of Love'), not just "a friend".
   FORMAT any list or longer answer to be scannable: a one-line summary, then "• " bullets (or "1. " numbers for steps), each item on its own line (\n), with a blank line between sections/themes. For a section header just write a short plain label line (e.g. "Work") — do NOT use markdown bold or asterisks (** **); Telegram shows them as literal characters.
   Example — "what do you know about me?" → a short intro line, then grouped bullets (Work, Goals, Personal, etc.), several points each. Be thorough; never padded.

If you genuinely don't know something about Parth, say so plainly — never guess or fabricate facts about him.

ACTION SHAPE (strict): each action is a FLAT object with a "type" field and its fields as siblings. Example:
{"reply":"Blocked it.","actions":[{"type":"create_event","summary":"ISB essay drafting","when":"2026-06-03T17:00:00+05:30","duration_min":30}]}
Do NOT nest fields under the type name (NOT {"create_event":{...}}).

CRITICAL: the ACTION fields (title, fact, item, summary, content) must each be ONE short line — no commentary, no repetition, no praise/poetry (a task about a person is just the bare action, e.g. "Call Pandit Sir — Sat evening"). The "reply" field is the ONLY place that may be longer and formatted (bullets/numbers) as described above. Always return valid JSON matching the schema.`;
}

export async function think(input: BrainInput): Promise<BrainResult> {
  const ctx = await loadContext();

  // Give the brain Parth's actual calendar (today + tomorrow) so it can answer
  // "what's my schedule?" / avoid double-booking when creating events.
  let scheduleBlock = "";
  try {
    if (await googleConnected()) {
      const events = await listUpcoming(7);
      scheduleBlock = events.length
        ? events.map((e) => `- ${e.start.slice(0, 10)} ${e.allDay ? "all day" : e.time} — ${e.summary}`).join("\n")
        : "(no events in the next 7 days)";
    }
  } catch (e) {
    console.error("brain calendar fetch failed:", e);
  }

  // Marathon training plan — so he can ask "what's my run today / this week?".
  let trainingBlock = "";
  try {
    const plan = await getPlan();
    if (plan) {
      const t = sessionFor(plan, ctx.today);
      const tomorrow = sessionFor(plan, addDaysISO(ctx.today, 1));
      const wk = weekSessions(plan, ctx.today);
      trainingBlock =
        `\n\nMARATHON TRAINING (${plan.race}, race day ${plan.race_date}):\n` +
        `Today (${ctx.today}): ${t ? `${t.week} ${t.day} — ${t.session} → ${describeSession(t.session)}` : "(no session / rest)"}\n` +
        `Tomorrow: ${tomorrow ? `${tomorrow.day} — ${tomorrow.session} → ${describeSession(tomorrow.session)}` : "(no session / rest)"}\n` +
        (wk.length ? `This week:\n${wk.map((d) => `- ${d.date} ${d.day}: ${d.session}`).join("\n")}` : "");
    }
  } catch (e) {
    console.error("brain training fetch failed:", e);
  }

  const system =
    buildSystemPrompt(ctx) +
    (scheduleBlock ? `\n\nPARTH'S CALENDAR (next 7 days):\n${scheduleBlock}` : "") +
    trainingBlock;

  const parts: GeminiPart[] = [];
  if (input.audio) {
    parts.push({ inline_data: { mime_type: input.audio.mime, data: input.audio.base64 } });
    parts.push({ text: input.text || "[The above is a voice note from Parth. Transcribe it, then act on it.]" });
  } else {
    parts.push({ text: input.text || "" });
  }

  const out = await generateJSON(system, parts, SCHEMA, ctx.model);
  return {
    reply: out.reply ?? "Done.",
    transcript: out.transcript || undefined,
    actions: Array.isArray(out.actions) ? out.actions : [],
  };
}
