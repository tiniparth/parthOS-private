import Link from "next/link";
import { googleConnected } from "@/lib/google";
import { listUpcoming } from "@/lib/calendar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import AddEvent from "../AddEvent";

export const dynamic = "force-dynamic";

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "short" }).format(new Date(iso + "T00:00:00+05:30"));

export default async function CalendarPage() {
  const connected = await googleConnected();
  const events = connected ? await listUpcoming(14) : [];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

  const byDate: Record<string, any[]> = {};
  for (const e of events) {
    const d = (e.start || "").slice(0, 10);
    (byDate[d] ||= []).push(e);
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight mb-5">Calendar</h1>
      {!connected ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Connect Google in <Link href="/dashboard/mail" className="text-primary">Mail</Link> to see your calendar.</p>
        </Card>
      ) : (
        <div className="space-y-5">
          <AddEvent />
          {Object.keys(byDate).length === 0 ? (
            <p className="text-sm text-muted-foreground">No events in the next 14 days.</p>
          ) : (
            Object.entries(byDate).map(([date, evs]) => (
              <div key={date}>
                <p className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", date === today ? "text-primary" : "text-muted-foreground")}>
                  {fmtDay(date)}{date === today ? " · today" : ""}
                </p>
                <div className="space-y-1.5">
                  {evs.map((e, i) => (
                    <div key={i} className="flex gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                      <span className="w-16 shrink-0 text-primary">{e.allDay ? "all day" : e.time}</span>
                      <span>{e.summary}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
