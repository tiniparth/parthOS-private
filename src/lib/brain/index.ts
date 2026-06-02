/* The brain. Loads Parth's context, asks Gemini what to do, returns a reply
   plus a list of actions for the caller to execute. Provider-agnostic: swap
   gemini.ts for a Claude implementation later without touching callers. */
import { generateJSON, GeminiPart } from "./gemini";
import { loadContext } from "../memory";
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
          type: { type: "string", enum: ["create_task", "create_note", "remember_fact"] },
          title: { type: "string" },
          due_date: { type: "string" },
          priority: { type: "string", enum: ["low", "med", "high"] },
          content: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          category: { type: "string" },
          fact: { type: "string" },
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

  return `You are Parth OS — Parth's personal assistant. You are warm, concise, and proactive. You speak to Parth directly and briefly, like a sharp chief-of-staff who already knows him.

Today is ${todayString(tz)} (timezone ${tz}).

WHO PARTH IS (profile):
${ctx.profile || "(profile not set yet)"}

THINGS YOU KNOW (learned facts):
${facts}

PARTH'S CURRENTLY OPEN TASKS:
${openTasks}

YOUR JOB on each message:
1. Understand what Parth wants (the message may be a voice note — transcribe it into "transcript").
2. Decide on ACTIONS:
   - "create_task" for anything he needs to do / remember to do. The "title" must be ONE short line — the exact actionable thing, max ~100 characters. Do NOT add commentary, embellishment, or repeated phrases. Resolve relative dates ("Friday", "tomorrow", "this weekend") to an absolute YYYY-MM-DD; put any extra detail in nothing — keep it terse. Set priority only if implied.
   - "create_note" for ideas, information, or things to keep that aren't tasks. Keep "content" concise.
   - "remember_fact" for durable facts about Parth, his work, people (e.g. Siddharth), or preferences worth remembering long-term. One sentence. Do NOT store one-off tasks as facts.
   - You may emit multiple actions from one message, or none (e.g. if he just asks a question).
3. Write a short, friendly "reply" confirming what you did or answering him — 1-3 sentences, no markdown headers, no rambling. Use his open tasks / facts to answer questions about himself or his work.

CRITICAL OUTPUT RULES: Every field is at most one short sentence. NEVER repeat words or phrases. NEVER add praise, poetry, reflections, or commentary about people — a task about a person is just the bare action (e.g. "Call Pandit Sir — Sat evening"). Be terse and precise. Always return valid JSON matching the schema.`;
}

export async function think(input: BrainInput): Promise<BrainResult> {
  const ctx = await loadContext();
  const system = buildSystemPrompt(ctx);

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
