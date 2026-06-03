/* Google Calendar (read-only). Shares the Google refresh token. */
import { googleAccessToken } from "./google";
import { todayISO } from "./time";

export interface CalEvent {
  id: string;
  summary: string;
  start: string; // ISO or date
  time: string; // friendly time, "" for all-day
  allDay: boolean;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Events from start of today through `daysAhead` days ahead (IST). */
export async function listUpcoming(daysAhead = 1): Promise<CalEvent[]> {
  const token = await googleAccessToken();
  if (!token) return [];

  const today = todayISO();
  const timeMin = `${today}T00:00:00+05:30`;
  const timeMax = `${addDays(today, daysAhead)}T23:59:59+05:30`;

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "25",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const j = await res.json();

  return (j.items ?? []).map((e: any) => {
    const allDay = !!e.start?.date;
    const startRaw = e.start?.dateTime || e.start?.date || "";
    let time = "";
    if (!allDay && startRaw) {
      time = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(startRaw));
    }
    return { id: e.id, summary: e.summary || "(no title)", start: startRaw, time, allDay } as CalEvent;
  });
}

/** Create an event. startISO can carry an offset (e.g. ...+05:30).
    If attendees (emails) are given, they're invited and Google emails them. */
export async function createEvent(summary: string, startISO: string, durationMin = 30, attendees: string[] = []): Promise<boolean> {
  const token = await googleAccessToken();
  if (!token) return false;
  const start = new Date(startISO);
  if (isNaN(start.getTime())) return false;
  const end = new Date(start.getTime() + durationMin * 60000);

  const valid = (attendees || []).map((e) => String(e).trim()).filter((e) => /.+@.+\..+/.test(e));
  const body: Record<string, unknown> = {
    summary,
    start: { dateTime: start.toISOString(), timeZone: "Asia/Kolkata" },
    end: { dateTime: end.toISOString(), timeZone: "Asia/Kolkata" },
  };
  if (valid.length) {
    body.attendees = valid.map((email) => ({ email }));
    // Default: any meeting WITH someone gets a Google Meet link attached.
    body.conferenceData = {
      createRequest: {
        requestId: `parthos-${start.getTime()}-${Math.random().toString(36).slice(2, 10)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  // sendUpdates=all emails the invite to attendees; conferenceDataVersion=1 is required to create the Meet link.
  const params = new URLSearchParams();
  if (valid.length) { params.set("sendUpdates", "all"); params.set("conferenceDataVersion", "1"); }
  const qs = params.toString();
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events" + (qs ? `?${qs}` : "");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error("createEvent error:", res.status, await res.text().catch(() => ""));
  return res.ok;
}
