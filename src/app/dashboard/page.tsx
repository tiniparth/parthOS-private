import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { loadDashboard } from "@/lib/dashboard";
import { getSetting } from "@/lib/settings";
import FocusCard from "./FocusCard";
import QuickCapture from "./QuickCapture";
import TodayTasks from "./TodayTasks";
import HabitTracker from "./HabitTracker";
import ScheduleCard from "./ScheduleCard";
import InboxCard from "./InboxCard";

export const dynamic = "force-dynamic";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
const prettyDate = () => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" }).format(new Date());

function SkeletonCard({ label }: { label: string }) {
  return (
    <Card className="p-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
    </Card>
  );
}

export default async function Today() {
  // Fast path only (Supabase). Google-dependent cards stream via Suspense below.
  const [d, focusSetting] = await Promise.all([loadDashboard(), getSetting("focus")]);

  const open = d.tasks.filter((t) => t.status !== "done");
  const dueToday = open.filter((t) => t.due_date && t.due_date <= d.today).length;
  const monthSpend = d.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const todaySpend = d.expenses.filter((e) => e.spent_on === d.today).reduce((s, e) => s + Number(e.amount || 0), 0);
  const habitCount: Record<string, number> = {};
  for (const h of d.habitLogs) habitCount[h.habit.toLowerCase()] = (habitCount[h.habit.toLowerCase()] || 0) + 1;
  const topStreak = Math.max(0, ...Object.values(habitCount));
  const focusSuggestion = open.filter((t) => t.due_date && t.due_date <= d.today)[0]?.title ?? "";

  const stats = [
    { n: dueToday, l: "due today", warn: dueToday > 0 },
    { n: open.length, l: "open tasks", warn: false },
    { n: `₹${todaySpend}`, l: "today", warn: false },
    { n: `🔥${topStreak}`, l: "streak", warn: false },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, Parth</h1>
        <span className="text-sm text-muted-foreground">{prettyDate()}</span>
      </div>

      <FocusCard suggestion={focusSuggestion} initialFocus={focusSetting || ""} />
      <QuickCapture />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <Card key={i} className="p-3 text-center">
            <div className={cn("text-xl font-bold leading-none", s.warn && "text-warn")}>{s.n}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
          </Card>
        ))}
      </div>

      {/* bento: schedule (left) + tasks (right) */}
      <div className="grid gap-4 md:grid-cols-2">
        <Suspense fallback={<SkeletonCard label="Schedule · today" />}>
          <ScheduleCard />
        </Suspense>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" /> Due today / overdue
          </div>
          <TodayTasks today={d.today} initial={d.tasks} />
        </Card>
      </div>

      {/* emails */}
      <Suspense fallback={<SkeletonCard label="Needs attention" />}>
        <InboxCard />
      </Suspense>

      {/* bottom bento: habits + expenses */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Habits · tap to log</p>
          <HabitTracker initial={d.habitLogs} />
        </div>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> Expenses
          </div>
          <div className="text-2xl font-bold">₹{todaySpend}<span className="ml-1 text-sm font-normal text-muted-foreground">today</span></div>
          <div className="mt-1 text-sm text-muted-foreground">₹{monthSpend} this month</div>
          <Link href="/dashboard/expenses" className="mt-3 inline-block text-sm text-primary">Manage expenses →</Link>
        </Card>
      </div>
    </div>
  );
}
