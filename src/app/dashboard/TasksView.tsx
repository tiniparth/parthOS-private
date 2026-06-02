"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const local = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const PRIO: Record<string, string> = { high: "bg-danger", med: "bg-warn", low: "bg-muted-foreground" };

export default function TasksView() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<any>({});
  const today = local();

  const load = useCallback(async () => {
    const r = await fetch("/api/crud/tasks");
    const j = await r.json();
    setTasks(j.rows || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done").slice(0, 15);
  const groups = [
    { key: "Overdue", items: open.filter((t) => t.due_date && t.due_date < today), tone: "text-danger" },
    { key: "Today", items: open.filter((t) => t.due_date === today), tone: "text-warn" },
    { key: "Upcoming", items: open.filter((t) => t.due_date && t.due_date > today), tone: "text-muted-foreground" },
    { key: "Someday", items: open.filter((t) => !t.due_date), tone: "text-muted-foreground" },
  ].filter((g) => g.items.length);

  async function add() {
    if (!draft.title) return;
    const r = await fetch("/api/crud/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draft.title, due_date: draft.due || null, priority: draft.priority || null }) });
    if (r.ok) { toast.success("Added"); setDraft({}); load(); } else toast.error("Couldn't add");
  }
  async function setDone(id: string, isDone: boolean) {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: isDone ? "done" : "open" } : t)));
    await fetch("/api/tasks/done", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, done: isDone }) });
  }
  async function del(id: string) {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    const r = await fetch(`/api/crud/tasks?id=${id}`, { method: "DELETE" });
    if (r.ok) toast.success("Deleted"); else { toast.error("Couldn't delete"); load(); }
  }

  const Row = (t: any) => (
    <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <button onClick={() => setDone(t.id, t.status !== "done")} className={cn("h-4 w-4 shrink-0 rounded border transition-colors", t.status === "done" ? "border-good bg-good" : "border-muted-foreground hover:border-good")} aria-label="toggle done" />
      {t.priority && <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIO[t.priority] || "bg-muted-foreground")} title={t.priority} />}
      <span className={cn("flex-1 text-sm", t.status === "done" && "line-through opacity-50")}>{t.title}</span>
      {t.due_date && <span className="text-xs text-muted-foreground">{t.due_date}</span>}
      <button onClick={() => del(t.id)} className="text-muted-foreground hover:text-danger" aria-label="delete"><Trash2 className="h-4 w-4" /></button>
    </div>
  );

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
          <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Task</label><input className={fieldClass} placeholder="What needs doing…" value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && add()} /></div>
          <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Due</label><input className={fieldClass} type="date" value={draft.due ?? ""} onChange={(e) => setDraft({ ...draft, due: e.target.value })} /></div>
          <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Priority</label><select className={fieldClass} value={draft.priority ?? ""} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}><option value="">—</option><option>low</option><option>med</option><option>high</option></select></div>
          <Button onClick={add}><Plus className="h-4 w-4" /> Add</Button>
        </div>
      </Card>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : open.length === 0 ? <p className="text-sm text-muted-foreground">No open tasks. 🎉</p> : (
        groups.map((g) => (
          <div key={g.key}>
            <p className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", g.tone)}>{g.key} · {g.items.length}</p>
            <div className="space-y-1.5">{g.items.map(Row)}</div>
          </div>
        ))
      )}

      {done.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recently done ({done.length})</summary>
          <div className="mt-2 space-y-1.5">{done.map(Row)}</div>
        </details>
      )}
    </div>
  );
}
