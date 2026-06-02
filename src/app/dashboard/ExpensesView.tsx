"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Trash2, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [offset, setOffset] = useState(0); // 0 = current month
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<any>({});

  const load = useCallback(async () => {
    const r = await fetch("/api/crud/expenses");
    const j = await r.json();
    setRows(j.rows ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const mDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const ym = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = mDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const pDate = new Date(now.getFullYear(), now.getMonth() + offset - 1, 1);
  const prevYm = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, "0")}`;

  const monthRows = rows.filter((e) => (e.spent_on || "").startsWith(ym));
  const monthTotal = monthRows.reduce((s, e) => s + Number(e.amount || 0), 0);
  const prevTotal = rows.filter((e) => (e.spent_on || "").startsWith(prevYm)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const delta = monthTotal - prevTotal;
  const todayTotal = offset === 0 ? rows.filter((e) => e.spent_on === localDate()).reduce((s, e) => s + Number(e.amount || 0), 0) : null;

  const byCat: Record<string, number> = {};
  for (const e of monthRows) byCat[e.category || "uncategorized"] = (byCat[e.category || "uncategorized"] || 0) + Number(e.amount || 0);
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const maxCat = cats[0]?.[1] || 1;

  const listRows = monthRows.filter((e) => !catFilter || (e.category || "uncategorized") === catFilter);
  const byDate: Record<string, Exp[]> = {};
  for (const e of [...listRows].sort((a, b) => (b.spent_on || "").localeCompare(a.spent_on || ""))) (byDate[e.spent_on] ||= []).push(e);

  async function add() {
    if (!draft.amount) return;
    const r = await fetch("/api/crud/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(draft.amount), item: draft.item || null, category: draft.category || null, spent_on: draft.spent_on || localDate() }) });
    if (r.ok) { toast.success("Logged"); setDraft({ spent_on: localDate(), category: "food" }); load(); } else toast.error("Couldn't add");
  }
  async function saveEdit() {
    const r = await fetch("/api/crud/expenses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, amount: Number(editDraft.amount), item: editDraft.item || null, category: editDraft.category || null, spent_on: editDraft.spent_on }) });
    if (r.ok) { toast.success("Updated"); setEditId(null); load(); } else toast.error("Couldn't update");
  }
  async function del(id: string) {
    setRows((r) => r.filter((e) => e.id !== id));
    const r = await fetch(`/api/crud/expenses?id=${id}`, { method: "DELETE" });
    if (r.ok) toast.success("Deleted"); else { toast.error("Couldn't delete"); load(); }
  }

  return (
    <div className="space-y-5">
      {/* month switcher + totals */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setOffset(offset - 1)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
          <span className="text-sm font-semibold">{monthLabel}</span>
          <button onClick={() => setOffset(Math.min(0, offset + 1))} disabled={offset >= 0} className={cn("rounded-lg p-1.5 text-muted-foreground hover:bg-muted", offset >= 0 && "opacity-30")}><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold">₹{monthTotal}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {todayTotal !== null && <>₹{todayTotal} today · </>}
              {prevTotal > 0 && (
                <span className={delta > 0 ? "text-danger" : "text-good"}>{delta > 0 ? "▲" : "▼"} ₹{Math.abs(delta)} vs last month</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* category breakdown (click to filter) */}
      {cats.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">By category</span>
            {catFilter && <button onClick={() => setCatFilter(null)} className="text-xs text-primary">clear filter</button>}
          </div>
          <div className="space-y-2">
            {cats.map(([c, amt]) => (
              <button key={c} onClick={() => setCatFilter(catFilter === c ? null : c)} className={cn("flex w-full items-center gap-3 rounded-lg px-1 py-0.5 text-left", catFilter === c && "bg-muted")}>
                <span className="w-20 shrink-0 text-sm capitalize">{c}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(amt / maxCat) * 100}%` }} /></div>
                <span className="w-16 shrink-0 text-right text-sm">₹{amt}</span>
              </button>
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

      {/* grouped list with edit/delete */}
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : Object.keys(byDate).length === 0 ? (
        <p className="text-sm text-muted-foreground">No expenses {catFilter ? `in ${catFilter}` : ""} for {monthLabel}.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(byDate).map(([date, items]) => (
            <div key={date}>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">{date} · ₹{items.reduce((s, e) => s + Number(e.amount || 0), 0)}</div>
              <div className="space-y-1.5">
                {items.map((e) => editId === e.id ? (
                  <div key={e.id} className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-2 md:grid-cols-[1fr_2fr_1.2fr_1.3fr_auto_auto] md:items-center">
                    <input className={fieldClass} type="number" value={editDraft.amount} onChange={(ev) => setEditDraft({ ...editDraft, amount: ev.target.value })} />
                    <input className={fieldClass} value={editDraft.item ?? ""} onChange={(ev) => setEditDraft({ ...editDraft, item: ev.target.value })} />
                    <select className={fieldClass} value={editDraft.category ?? ""} onChange={(ev) => setEditDraft({ ...editDraft, category: ev.target.value })}><option value="">—</option>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
                    <input className={fieldClass} type="date" value={editDraft.spent_on} onChange={(ev) => setEditDraft({ ...editDraft, spent_on: ev.target.value })} />
                    <Button size="sm" variant="good" onClick={saveEdit}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>×</Button>
                  </div>
                ) : (
                  <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    <span className="w-16 font-medium">₹{e.amount}</span>
                    <span className="flex-1 truncate">{e.item || "—"}</span>
                    {e.category && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{e.category}</span>}
                    <button onClick={() => { setEditId(e.id); setEditDraft({ amount: e.amount, item: e.item, category: e.category, spent_on: e.spent_on }); }} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del(e.id)} className="text-muted-foreground hover:text-danger"><Trash2 className="h-4 w-4" /></button>
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
