"use client";
import { useEffect, useState, useCallback } from "react";

export default function TodayTasks({ today, initial }: { today: string; initial?: any[] }) {
  const [tasks, setTasks] = useState<any[]>(initial ? initial.filter((t) => t.status !== "done") : []);
  const [loading, setLoading] = useState(!initial);

  const load = useCallback(async () => {
    const r = await fetch("/api/crud/tasks");
    const j = await r.json();
    setTasks((j.rows || []).filter((t: any) => t.status !== "done"));
    setLoading(false);
  }, []);
  useEffect(() => { if (!initial) load(); }, [initial, load]);

  const relevant = tasks
    .filter((t) => t.due_date && t.due_date <= today)
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));

  async function done(id: string) {
    setTasks((ts) => ts.filter((t) => t.id !== id)); // optimistic
    await fetch("/api/tasks/done", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, done: true }) });
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!relevant.length) return <p className="text-sm text-muted-foreground">Nothing due today. ✨</p>;

  return (
    <ul className="space-y-2">
      {relevant.map((t) => {
        const overdue = t.due_date < today;
        return (
          <li key={t.id} className="flex items-center gap-3 text-sm">
            <button
              onClick={() => done(t.id)}
              className="h-4 w-4 shrink-0 rounded border border-muted-foreground transition-colors hover:border-good hover:bg-good/20"
              aria-label="Complete task"
            />
            <span className="flex-1">{t.title}</span>
            {overdue ? (
              <span className="text-xs text-danger">overdue · {t.due_date}</span>
            ) : (
              <span className="text-xs text-muted-foreground">today</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
