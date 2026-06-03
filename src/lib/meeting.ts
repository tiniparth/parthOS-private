/* Turn a call-recording transcript (often Hindi/Marathi/English mixed) into a
   clean English summary + crisp action items. Used by the Telegram handler when
   Parth dumps a recording. The brain is the same Groq model as everywhere else. */
import { generateJSON } from "./brain/groq";
import { env } from "./env";
import { todayISO } from "./time";

export interface MeetingResult {
  title: string;
  summary: string;
  decisions: string[];
  action_items: { title: string; owner?: string; due_date?: string }[];
  client?: string;
}

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    decisions: { type: "array", items: { type: "string" } },
    action_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          owner: { type: "string" },
          due_date: { type: "string" },
        },
        required: ["title"],
      },
    },
    client: { type: "string" },
  },
  required: ["summary", "action_items"],
};

function todayLong(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date());
}

export async function summariseMeeting(transcript: string, model: string): Promise<MeetingResult> {
  const tz = env.tz();
  const sys = `You are Parth's chief-of-staff processing a CALL RECORDING transcript. The audio may be in Hindi, Marathi, and English mixed (code-switched), and the transcript may be rough — understand all of it and produce everything in clear, professional ENGLISH.

Today is ${todayLong(tz)} (timezone ${tz}). Resolve any spoken relative dates ("by Friday", "next week", "month-end") to absolute YYYY-MM-DD.

Produce:
- "title": a short label for the call (e.g. "Empower — pricing discussion").
- "summary": a tight, scannable recap — what was discussed, key points, and any concerns raised. Use short lines/bullets, not an essay. Faithful to the transcript; never invent facts.
- "decisions": the concrete decisions/agreements made (empty array if none).
- "action_items": every follow-up, as a flat list. Each "title" is ONE short actionable line (no date text inside it). Set "owner" to who owns it ("Parth" or the person's name) and "due_date" (YYYY-MM-DD) if a deadline was stated or implied. Capture PARTH'S to-dos especially.
- "client": the client/company name if this call clearly maps to one (else omit).

Be faithful and concise. Return valid JSON matching the schema.`;

  const out = await generateJSON(sys, [{ text: "TRANSCRIPT:\n" + transcript.slice(0, 60000) }], SCHEMA, model);
  return {
    title: String(out.title || "Call notes"),
    summary: String(out.summary || ""),
    decisions: Array.isArray(out.decisions) ? out.decisions.map(String) : [],
    action_items: Array.isArray(out.action_items)
      ? out.action_items.filter((a: any) => a?.title).map((a: any) => ({ title: String(a.title), owner: a.owner ? String(a.owner) : undefined, due_date: a.due_date ? String(a.due_date) : undefined }))
      : [],
    client: out.client ? String(out.client) : undefined,
  };
}
