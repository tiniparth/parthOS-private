"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const local = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const pretty = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso + "T00:00:00+05:30"));

export default function JournalView() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState("");
  const [date, setDate] = useState(local());

  const load = useCallback(async () => {
    const r = await fetch("/api/crud/journal");
    const j = await r.json();
    setRows(j.rows ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!entry.trim()) return;
    const r = await fetch("/api/crud/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entry, entry_date: date }) });
    if (r.ok) { toast.success("Journaled ✍️"); setEntry(""); load(); } else toast.error("Couldn't save");
  }
  async function del(id: string) {
    setRows((r) => r.filter((e) => e.id !== id));
    await fetch(`/api/crud/journal?id=${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New entry</span>
          <input className={cn(fieldClass, "h-8 w-auto")} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <textarea className={cn(fieldClass, "min-h-[120px] py-2.5")} placeholder="What's on your mind? Wins, blockers, reflections…" value={entry} onChange={(e) => setEntry(e.target.value)} />
        <div className="mt-3 flex justify-end"><Button onClick={add}>Save entry</Button></div>
      </Card>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries yet — start with today.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{pretty(e.entry_date)}</span>
                <button onClick={() => del(e.id)} className="text-muted-foreground hover:text-danger"><Trash2 className="h-4 w-4" /></button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{e.entry}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
