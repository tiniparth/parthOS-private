import Link from "next/link";
import { Calendar, Mail, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { loadDashboard } from "@/lib/dashboard";
import { googleConnected } from "@/lib/google";
import { unreadCount } from "@/lib/gmail";
import { listUpcoming } from "@/lib/calendar";
import { getSetting } from "@/lib/settings";
import FocusCard from "./FocusCard";
import QuickCapture from "./QuickCapture";
import TodayTasks from "./TodayTasks";
import HabitTracker from "./HabitTracker";

export const dynamic = "force-dynamic";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
function prettyDate() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" }).format(new Date());
}

export default async function Today() {
  // Fetch everything that doesn't depend on each other in parallel.
  const [d, connected, focusSetting, triageRaw] = await Promise.all([
    loadDashboard(),
    googleConnected(),
    getSetting("focus"),
    getSetting("triage_cache"),
  ]);
  const [unread, events] = connected ? await Promise.all([unreadCount(), listUpcoming(0)]) : [0, []];

  const open = d.tasks.filter((t) => t.status !== "done");
  const dueTodayList = open.filter((t) => t.due_date && t.due_date <= d.today);
  const spendToday = d.expenses.filter((e) => e.spent_on === d.today).reduce((s, e) => s + Number(e.amount || 0), 0);
  const habitCount: Record<string, number> = {};
  for (const h of d.habitLogs) habitCount[h.habit.toLowerCase()] = (habitCount[h.habit.toLowerCase()] || 0) + 1;
  const topStreak = Math.max(0, ...Object.values(habitCount));

  // Focus suggestion: the most urgent task (overdue/today), if any.
  const focusSuggestion = dueTodayList[0]?.title ?? "";

  // Needs-attention mail from cached triage (no forced brain call).
  let highMail: any[] = [];
  try {
    if (triageRaw) {
      const o = JSON.parse(triageRaw);
      if (o.at && Date.now() - o.at < 30 * 60 * 1000) highMail = (o.mail || []).filter((m: any) => m.importance === "high");
    }
  } catch { /* ignore */ }

  const stats = [
    { n: dueTodayList.length, l: "due today", warn: dueTodayList.length > 0 },
    { n: connected ? unread : "—", l: "unread", warn: false },
    { n: `₹${spendToday}`, l: "today", warn: false },
    { n: `🔥${topStreak}`, l: "streak", warn: false },
  ];

  return (
    <div className="space-y-5">
      {/* greeting */}
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, Parth</h1>
        <span className="text-sm text-muted-foreground">{prettyDate()}</span>
      </div>

      {/* focus */}
      <FocusCard suggestion={focusSuggestion} initialFocus={focusSetting || ""} />

      {/* quick capture */}
      <QuickCapture />

      {/* vital signs */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Card key={i} className="p-3 text-center">
            <div className={cn("text-xl font-bold leading-none", s.warn && "text-warn")}>{s.n}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
          </Card>
        ))}
      </div>

      {/* schedule today */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" /> Schedule · today
        </div>
        {!connected ? (
          <p className="text-sm text-muted-foreground">Connect Google in <Link href="/dashboard/mail" className="text-primary">Mail</Link>.</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events today. Clear runway. 🛫</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {events.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-16 shrink-0 text-primary">{e.allDay ? "all day" : e.time}</span>
                <span>{e.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* due today / overdue */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" /> Due today / overdue
        </div>
        <TodayTasks today={d.today} initial={d.tasks} />
      </Card>

      {/* needs attention */}
      <Card className="p-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Mail className="h-3.5 w-3.5" /> Needs attention
        </div>
        {!connected ? (
          <Link href="/dashboard/mail" className="text-sm text-primary">Connect Gmail →</Link>
        ) : highMail.length ? (
          <ul className="space-y-1.5 text-sm">
            {highMail.slice(0, 4).map((m, i) => (
              <li key={i} className="flex flex-col">
                <span>{m.subject}</span>
                <span className="text-xs text-muted-foreground">{(m.from || "").replace(/<.*>/, "").trim()}{m.needs_reply ? " · ↩ reply" : ""}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{unread}</span> unread ·{" "}
            <Link href="/dashboard/mail" className="text-primary">open triage →</Link>
          </p>
        )}
      </Card>

      {/* habits */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Habits · tap to log today</p>
        <HabitTracker initial={d.habitLogs} />
      </div>
    </div>
  );
}
