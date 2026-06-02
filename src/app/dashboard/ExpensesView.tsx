"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CATS = ["food", "travel", "work", "personal", "other"];
const localDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

type Exp = { id: string; amount: number; item: string | null; category: string | null; spent_on: string };

export default function ExpensesView() {
  const [rows, setRows] = useState<Exp[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<any>({ spent_on: localDate(), category: "food" });

  const load = useCallback(async () => {
    const r = await fetch("/api/crud/expenses");
    const j = await r.json();
    setRows(j.rows ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const month = localDate().slice(0, 7);
  const today = localDate();
  const inMonth = rows.filter((e) => (e.spent_on || "").startsWith(month));
  const monthTotal = inMonth.reduce((s, e) => s + Number(e.amount || 0), 0);
  const todayTotal = rows.filter((e) => e.spent_on === today).reduce((s, e) => s + Number(e.amount || 0), 0);

  const byCat: Record<string, number> = {};
  for (const e of inMonth) byCat[e.category || "uncategorized"] = (byCat[e.category || "uncategorized"] || 0) + Number(e.amount || 0);
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const maxCat = cats[0]?.[1] || 1;

  // group list by date
  const byDate: Record<string, Exp[]> = {};
  for (const e of [...rows].sort((a, b) => (b.spent_on || "").localeCompare(a.spent_on || ""))) {
    (byDate[e.spent_on] ||= []).push(e);
  }

  async function add() {
    if (!draft.amount) return;
    const res = await fetch("/api/crud/expenses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(draft.amount), item: draft.item || null, category: draft.category || null, spent_on: draft.spent_on || today }),
    });
    if (res.ok) { toast.success("Logged"); setDraft({ spent_on: localDate(), category: "food" }); load(); } else toast.error("Couldn't add");
  }
  async function del(id: string) {
    setRows((r) => r.filter((e) => e.id !== id));
    const res = await fetch(`/api/crud/expenses?id=${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Deleted"); else { toast.error("Couldn't delete"); load(); }
  }

  return (
    <div className="space-y-5">
      {/* totals */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4"><div className="text-2xl font-bold">₹{monthTotal}</div><div className="mt-1 text-xs text-muted-foreground">this month</div></Card>
        <Card className="p-4"><div className="text-2xl font-bold">₹{todayTotal}</div><div className="mt-1 text-xs text-muted-foreground">today</div></Card>
      </div>

      {/* category breakdown */}
      {cats.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">By category · this month</div>
          <div className="space-y-2">
            {cats.map(([c, amt]) => (
              <div key={c} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm capitalize">{c}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(amt / maxCat) * 100}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right text-sm">₹{amt}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* quick add */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_2fr_1.2fr_1.3fr_auto] md:items-end">
          <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Amount</label><input className={fieldClass} type="number" placeholder="₹" value={draft.amount ?? ""} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></div>
          <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Item</label><input className={fieldClass} placeholder="lunch…" value={draft.item ?? ""} onChange={(e) => setDraft({ ...draft, item: e.target.value })} /></div>
          <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Category</label><select className={fieldClass} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Date</label><input className={fieldClass} type="date" value={draft.spent_on} onChange={(e) => setDraft({ ...draft, spent_on: e.target.value })} /></div>
          <Button onClick={add}>+ Add</Button>
        </div>
      </Card>

      {/* grouped list */}
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : Object.keys(byDate).length === 0 ? (
        <p className="text-sm text-muted-foreground">No expenses yet.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(byDate).map(([date, items]) => (
            <div key={date}>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">{date} · ₹{items.reduce((s, e) => s + Number(e.amount || 0), 0)}</div>
              <div className="space-y-1.5">
                {items.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    <span className="w-16 font-medium">₹{e.amount}</span>
                    <span className="flex-1 truncate">{e.item || "—"}</span>
                    {e.category && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{e.category}</span>}
                    <button onClick={() => del(e.id)} className="text-muted-foreground hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
