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

const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA").format(d);
function lastNDays(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); out.push(fmt(d)); }
  return out;
}
function streak(done: Set<string>): number {
  let s = 0; const d = new Date();
  while (done.has(fmt(d))) { s++; d.setDate(d.getDate() - 1); }
  return s;
}
function build(rows?: { habit: string; done_on: string }[]) {
  const map: Record<string, Set<string>> = {};
  for (const h of HABITS) map[h.key] = new Set();
  for (const r of rows ?? []) {
    const k = String(r.habit || "").toLowerCase();
    (map[k] ||= new Set()).add(r.done_on);
  }
  return map;
}

export default function HabitTracker({ initial }: { initial?: { habit: string; done_on: string }[] }) {
  const [byHabit, setByHabit] = useState<Record<string, Set<string>>>(() => (initial ? build(initial) : {}));
  const week = lastNDays(7);
  const today = fmt(new Date());

  const load = useCallback(async () => {
    const res = await fetch("/api/crud/habit_logs");
    const j = await res.json();
    setByHabit(build(j.rows));
  }, []);
  useEffect(() => { if (!initial) load(); }, [initial, load]);

  async function toggle(habit: string) {
    // optimistic — flip today's dot instantly
    setByHabit((prev) => {
      const next = { ...prev };
      const s = new Set(next[habit] ?? []);
      s.has(today) ? s.delete(today) : s.add(today);
      next[habit] = s;
      return next;
    });
    const res = await fetch("/api/habits/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ habit }) });
    if (res.ok) { const j = await res.json(); toast.success(j.done ? "Logged for today 🔥" : "Unmarked"); }
    else { toast.error("Couldn't update"); load(); }
  }

  return (
    <div className="space-y-3">
      {HABITS.map((h) => {
        const done = byHabit[h.key] ?? new Set<string>();
        const isToday = done.has(today);
        const st = streak(done);
        return (
          <div key={h.key} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-2xl">{h.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{h.label}</span>
                {st > 0 && <span className="text-xs text-warn">🔥 {st}d</span>}
              </div>
              <div className="mt-1.5 flex gap-1.5">
                {week.map((d) => (
                  <span key={d} title={d} className={cn("h-2.5 w-2.5 rounded-full", done.has(d) ? "bg-good" : "bg-muted", d === today && "ring-1 ring-foreground/40")} />
                ))}
              </div>
            </div>
            <button
              onClick={() => toggle(h.key)}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all",
                isToday ? "border-good bg-good text-[#04231a]" : "border-border text-muted-foreground hover:border-good hover:text-good"
              )}
              aria-label={`Toggle ${h.label}`}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
