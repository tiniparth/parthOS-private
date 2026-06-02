import Link from "next/link";
import { Calendar, Mail } from "lucide-react";
import CrudTable from "./CrudTable";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { loadDashboard } from "@/lib/dashboard";
import { googleConnected } from "@/lib/google";
import { unreadCount } from "@/lib/gmail";
import { listUpcoming } from "@/lib/calendar";

export const dynamic = "force-dynamic";

const TRACKED = ["running", "reading", "yoga", "journalling"];

export default async function Today() {
  const d = await loadDashboard();
  const connected = await googleConnected();
  const [unread, events] = connected ? await Promise.all([unreadCount(), listUpcoming(7)]) : [0, []];

  const open = d.tasks.filter((t) => t.status !== "done");
  const dueToday = open.filter((t) => t.due_date && t.due_date <= d.today).length;
  const spendTotal = d.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const habitCount: Record<string, number> = {};
  for (const h of d.habitLogs) habitCount[h.habit.toLowerCase()] = (habitCount[h.habit.toLowerCase()] || 0) + 1;

  const stats = [
    { n: dueToday, l: "due today", warn: dueToday > 0 },
    { n: open.length, l: "open tasks", warn: false },
    { n: connected ? unread : "—", l: "unread mail", warn: false },
    { n: `₹${spendTotal}`, l: "spent / month", warn: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <span className="text-sm text-muted-foreground">{d.today}</span>
      </div>

      {/* vital signs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Card key={i} className="p-4">
            <div className={cn("text-2xl font-bold leading-none", s.warn && "text-warn")}>{s.n}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
          </Card>
        ))}
      </div>

      {/* schedule */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" /> Schedule · next 7 days
        </div>
        {!connected ? (
          <p className="text-sm text-muted-foreground">
            Connect Google in <Link href="/dashboard/mail" className="text-primary">Mail</Link> to see your calendar.
          </p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events. Clear runway. 🛫</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {events.slice(0, 10).map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-24 shrink-0 text-primary">{e.start.slice(5, 10)} {e.allDay ? "" : e.time}</span>
                <span>{e.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* inbox */}
      <Card className="p-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Mail className="h-3.5 w-3.5" /> Inbox
        </div>
        {connected ? (
          <p className="text-sm">
            <span className="text-xl font-bold">{unread}</span> unread ·{" "}
            <Link href="/dashboard/mail" className="text-primary">open triage →</Link>
          </p>
        ) : (
          <Link href="/dashboard/mail" className="text-sm text-primary">Connect Gmail →</Link>
        )}
      </Card>

      {/* habits glance */}
      <div className="grid grid-cols-4 gap-3">
        {TRACKED.map((h) => (
          <Card key={h} className="p-3 text-center">
            <div className={cn("text-xl font-bold", habitCount[h] && "text-good")}>{habitCount[h] || 0}×</div>
            <div className="text-xs capitalize text-muted-foreground">{h}</div>
          </Card>
        ))}
      </div>

      {/* tasks — inline CRUD */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tasks · {open.length} open</p>
        <CrudTable
          table="tasks"
          columns={[
            { key: "title", label: "Title", type: "text", placeholder: "What needs doing…" },
            { key: "status", label: "Status", type: "select", options: ["open", "done"] },
            { key: "priority", label: "Priority", type: "select", options: ["low", "med", "high"] },
            { key: "due_date", label: "Due", type: "date" },
          ]}
        />
      </section>
    </div>
  );
}
