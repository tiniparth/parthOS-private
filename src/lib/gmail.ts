/* Gmail (read-only) + contextual triage.
   Uses the stored refresh token to read recent mail, then asks the brain to
   rank importance using what it knows about Parth (clients, people). */
import { googleAccessToken, googleConnected } from "./google";
import { getSetting, setSetting } from "./settings";
import { loadContext } from "./memory";
import { generateJSON } from "./brain/groq";

const TRIAGE_CACHE_KEY = "triage_cache";
const TRIAGE_TTL_MS = 10 * 60 * 1000; // 10 min — avoid a Gemini call on every page load

export interface MailItem {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export interface TriagedMail extends Partial<MailItem> {
  from: string;
  subject: string;
  importance: "high" | "low";
  why: string;
  needs_reply: boolean;
}

export const isGmailConnected = googleConnected;

/** Cheap unread-inbox count (one API call, no per-message fetch). */
export async function unreadCount(): Promise<number> {
  const token = await googleAccessToken();
  if (!token) return 0;
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent("is:unread in:inbox")}&maxResults=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const j = await res.json();
  return j.resultSizeEstimate ?? 0;
}

const header = (headers: any[], name: string) =>
  headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

export async function listRecent(max = 18, q = "in:inbox newer_than:7d"): Promise<MailItem[]> {
  const token = await googleAccessToken();
  if (!token) return [];
  const auth = { Authorization: `Bearer ${token}` };

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=${encodeURIComponent(q)}`,
    { headers: auth }
  );
  const list = await listRes.json();
  const ids: string[] = (list.messages ?? []).map((m: any) => m.id);

  const items = await Promise.all(
    ids.map(async (id) => {
      const r = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: auth }
      );
      const m = await r.json();
      const h = m.payload?.headers ?? [];
      return {
        id,
        from: header(h, "From"),
        subject: header(h, "Subject"),
        snippet: (m.snippet ?? "").slice(0, 200),
        date: header(h, "Date"),
        unread: (m.labelIds ?? []).includes("UNREAD"),
      } as MailItem;
    })
  );
  return items;
}

const TRIAGE_SCHEMA = {
  type: "object",
  properties: {
    mail: {
      type: "array",
      items: {
        type: "object",
        properties: {
          from: { type: "string" },
          subject: { type: "string" },
          importance: { type: "string", enum: ["high", "low"] },
          why: { type: "string" },
          needs_reply: { type: "boolean" },
        },
        required: ["from", "subject", "importance", "why", "needs_reply"],
      },
    },
  },
  required: ["mail"],
};

/** Rank recent mail by importance using Parth's context.
    Cached for 10 min so browsing the dashboard doesn't burn a Gemini call each load. */
export async function triageInbox(max = 18, force = false): Promise<TriagedMail[]> {
  if (!force) {
    const cached = await getSetting(TRIAGE_CACHE_KEY);
    if (cached) {
      try {
        const o = JSON.parse(cached);
        if (o.at && Date.now() - o.at < TRIAGE_TTL_MS) return o.mail as TriagedMail[];
      } catch {
        /* ignore */
      }
    }
  }

  const emails = await listRecent(max);
  if (emails.length === 0) return [];

  const ctx = await loadContext();
  const facts = ctx.facts.map((f) => `- ${f.fact}`).join("\n");
  const list = emails
    .map((e, i) => `${i + 1}. From: ${e.from} | Subject: ${e.subject} | ${e.unread ? "UNREAD" : "read"} | ${e.snippet}`)
    .join("\n");

  const sys = `You triage Parth's email by importance, using what you know about him.

WHO PARTH IS:
${ctx.profile}

KNOWN FACTS:
${facts}

IMPORTANT = real people, clients (e.g. Empower / Dr. Jamal, Bliss Anand / Ankit / Satish, Siddharth), anything needing his action or a reply, deals, money, meetings.
LOW = marketing, newsletters, promotions, automated notifications, no-reply senders.

For EACH email return: from, subject, importance (high|low), a short "why" (≤10 words), and needs_reply (true/false). Be decisive. Return valid JSON.`;

  const out = await generateJSON(sys, [{ text: `Recent emails:\n${list}` }], TRIAGE_SCHEMA, ctx.model);
  const mail = Array.isArray(out.mail) ? out.mail : [];
  await setSetting(TRIAGE_CACHE_KEY, JSON.stringify({ at: Date.now(), mail }));
  return mail;
}
