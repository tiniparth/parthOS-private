"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const HABITS = [
  { key: "running", label: "Running", icon: "🏃" },
  { key: "reading", label: "Reading", icon: "📖" },
  { key: "yoga", label: "Yoga", icon: "🧘" },
  { key: "journalling", label: "Journalling", icon: "✍️" },
];

// Local (IST-browser) date helpers.
const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA").format(d); // YYYY-MM-DD
function lastNDays(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(fmt(d));
  }
  return out;
}
function streak(doneSet: Set<string>): number {
  let s = 0;
  const d = new Date();
  // count back from today while each day is done
  for (;;) {
    if (doneSet.has(fmt(d))) { s++; d.setDate(d.getDate() - 1); } else break;
  }
  return s;
}

export default function HabitTracker() {
  const [byHabit, setByHabit] = useState<Record<string, Set<string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const week = lastNDays(7);
  const today = fmt(new Date());

  const load = useCallback(async () => {
    const res = await fetch("/api/crud/habit_logs");
    const j = await res.json();
    const map: Record<string, Set<string>> = {};
    for (const h of HABITS) map[h.key] = new Set();
    for (const row of j.rows ?? []) {
      const k = String(row.habit || "").toLowerCase();
      if (!map[k]) map[k] = new Set();
      map[k].add(row.done_on);
    }
    setByHabit(map);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggle(habit: string) {
    setBusy(habit);
    const res = await fetch("/api/habits/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit }),
    });
    const j = await res.json();
    if (res.ok) {
      toast.success(j.done ? "Nice — logged for today 🔥" : "Unmarked for today");
      await load();
    } else toast.error("Couldn't update");
    setBusy(null);
  }

  return (
    <div className="space-y-3">
      {HABITS.map((h) => {
        const done = byHabit[h.key] ?? new Set();
        const isToday = done.has(today);
        const st = streak(done);
        return (
          <div key={h.key} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-2xl">{h.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{h.label}</span>
                {st > 0 && <span className="text-xs text-warn">🔥 {st}d</span>}
              </div>
              {/* weekly streak dots (secondary line) */}
              <div className="mt-1.5 flex gap-1.5">
                {week.map((d) => (
                  <span
                    key={d}
                    title={d}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      done.has(d) ? "bg-good" : "bg-muted",
                      d === today && "ring-1 ring-foreground/40"
                    )}
                  />
                ))}
              </div>
            </div>
            {/* big daily check-off (primary) */}
            <button
              onClick={() => toggle(h.key)}
              disabled={busy === h.key}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all disabled:opacity-50",
                isToday
                  ? "border-good bg-good text-[#04231a]"
                  : "border-border text-muted-foreground hover:border-good hover:text-good"
              )}
              aria-label={`Toggle ${h.label} for today`}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
