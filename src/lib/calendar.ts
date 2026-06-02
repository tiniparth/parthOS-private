/* Google Calendar (read-only). Shares the Google refresh token. */
import { googleAccessToken } from "./google";
import { todayISO } from "./memory";

export interface CalEvent {
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
    return { summary: e.summary || "(no title)", start: startRaw, time, allDay } as CalEvent;
  });
}
