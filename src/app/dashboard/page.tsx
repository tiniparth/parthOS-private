import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { loadDashboard } from "@/lib/dashboard";
import { getSetting } from "@/lib/settings";
import FocusCard from "./FocusCard";
import QuickCapture from "./QuickCapture";
import TodayTasks from "./TodayTasks";
import HabitTracker from "./HabitTracker";
import ScheduleCard from "./ScheduleCard";
import InboxCard from "./InboxCard";
import TrainingToday from "./TrainingToday";

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
  const monthSpend = d.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const todaySpend = d.expenses.filter((e) => e.spent_on === d.today).reduce((s, e) => s + Number(e.amount || 0), 0);
  const focusSuggestion = open.filter((t) => t.due_date && t.due_date <= d.today)[0]?.title ?? "";
  const topClient = d.clients.find((c) => c.priority === "high") || d.clients[0];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, Parth</h1>
        <span className="text-sm text-muted-foreground">{prettyDate()}</span>
      </div>

      <FocusCard suggestion={focusSuggestion} initialFocus={focusSetting || ""} />
      <QuickCapture />

      {/* bento — two columns so more is visible at a glance */}
      <div className="grid items-start gap-4 md:grid-cols-2">
        {/* LEFT: tasks · run · habits */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" /> Due today / overdue
            </div>
            <TodayTasks today={d.today} initial={d.tasks} />
          </Card>

          <TrainingToday />

          <Card className="p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Habits · tap to log</div>
            <HabitTracker initial={d.habitLogs} />
          </Card>
        </div>

        {/* RIGHT: priority · schedule · inbox · expenses */}
        <div className="space-y-4">
          {topClient && (
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">⭐ Top priority</span>
                <Link href="/dashboard/clients" className="text-xs text-primary">Pipeline →</Link>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">{topClient.name}</span>
                {topClient.stage && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{topClient.stage}</span>}
              </div>
              {topClient.next_action && <p className="mt-1.5 text-sm"><span className="text-muted-foreground">Next: </span>{topClient.next_action}</p>}
              {topClient.blocker && <p className="mt-1 text-sm text-warn">⚠ Blocker: {topClient.blocker}</p>}
              {(topClient.contact || topClient.last_contact) && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {topClient.contact && <span>👤 {topClient.contact}</span>}
                  {topClient.last_contact && <span>🕒 last contact {topClient.last_contact}</span>}
                </div>
              )}
            </Card>
          )}

          <Suspense fallback={<SkeletonCard label="Schedule · today" />}>
            <ScheduleCard />
          </Suspense>

          <Suspense fallback={<SkeletonCard label="Needs attention" />}>
            <InboxCard />
          </Suspense>

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
    </div>
  );
}
