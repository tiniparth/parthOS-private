"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STATUS = ["active", "paused", "done"];

export default function GoalsView() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<any>({ status: "active" });
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>({});

  const load = useCallback(async () => {
    const r = await fetch("/api/crud/goals");
    const j = await r.json();
    setRows(j.rows ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!draft.title) return;
    const r = await fetch("/api/crud/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, progress: Number(draft.progress) || 0 }) });
    if (r.ok) { toast.success("Goal added"); setDraft({ status: "active" }); load(); } else toast.error("Couldn't add");
  }
  async function save() {
    const r = await fetch("/api/crud/goals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...edit, progress: Number(edit.progress) || 0 }) });
    if (r.ok) { toast.success("Saved"); setEditId(null); load(); } else toast.error("Couldn't save");
  }
  async function del(id: string) {
    if (!confirm("Delete this goal?")) return;
    setRows((r) => r.filter((g) => g.id !== id));
    await fetch(`/api/crud/goals?id=${id}`, { method: "DELETE" });
  }

  const active = rows.filter((g) => g.status !== "done");
  const done = rows.filter((g) => g.status === "done");

  const Field = (k: string, label: string, type = "text", opts?: string[]) => (
    <div>
      <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">{label}</label>
      {opts ? <select className={fieldClass} value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
        : <input className={fieldClass} type={type} value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />}
    </div>
  );

  const GoalCard = (g: any) => (
    <Card key={g.id} className="p-4">
      {editId === g.id ? (
        <div className="space-y-3">
          {Field("title", "Goal")}
          {Field("why", "Why it matters")}
          <div className="grid grid-cols-3 gap-3">{Field("status", "Status", "text", STATUS)}{Field("target_date", "Target", "date")}{Field("progress", "Progress %", "number")}</div>
          <div className="flex gap-2"><Button size="sm" variant="good" onClick={save}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button></div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-3">
            <span className={cn("font-semibold", g.status === "done" && "line-through opacity-60")}>{g.title}</span>
            <div className="flex items-center gap-2">
              {g.target_date && <span className="text-xs text-muted-foreground">{g.target_date}</span>}
              <button onClick={() => { setEditId(g.id); setEdit({ title: g.title, why: g.why, status: g.status, target_date: g.target_date, progress: g.progress }); }} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => del(g.id)} className="text-muted-foreground hover:text-danger"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          {g.why && <div className="mt-1 text-sm text-muted-foreground">{g.why}</div>}
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-good" style={{ width: `${Math.min(100, Number(g.progress) || 0)}%` }} /></div>
            <span className="w-10 text-right text-xs text-muted-foreground">{Number(g.progress) || 0}%</span>
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_auto] md:items-end">
          <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Goal</label><input className={fieldClass} placeholder="e.g. Close Empower; GMAT 705+" value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
          <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Target date</label><input className={fieldClass} type="date" value={draft.target_date ?? ""} onChange={(e) => setDraft({ ...draft, target_date: e.target.value })} /></div>
          <Button onClick={add}>+ Add</Button>
        </div>
      </Card>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No goals yet — what are you driving toward?</p> : (
        <>
          <div className="space-y-3">{active.map(GoalCard)}</div>
          {done.length > 0 && <details><summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">Achieved ({done.length})</summary><div className="mt-3 space-y-3">{done.map(GoalCard)}</div></details>}
        </>
      )}
    </div>
  );
}
