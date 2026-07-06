"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ExternalLink, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const KINDS = ["race", "build", "memo", "now", "milestone"];

const KIND_TONE: Record<string, string> = {
  race: "text-good",
  build: "text-primary",
  memo: "text-danger",
  now: "text-muted-foreground",
  milestone: "text-foreground",
};

export default function PortfolioView() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<any>({ kind: "milestone" });

  const load = useCallback(async () => {
    const r = await fetch("/api/crud/portfolio_queue");
    const j = await r.json();
    setRows(j.rows ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function patch(id: number, body: Record<string, unknown>, msg: string) {
    const r = await fetch("/api/crud/portfolio_queue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (r.ok) { toast.success(msg); load(); } else toast.error("Couldn't update");
  }
  const publish = (id: number) => patch(id, { status: "live", published_at: new Date().toISOString() }, "Live on the site 🎉");
  const reject = (id: number) => patch(id, { status: "rejected" }, "Skipped");
  const unpublish = (id: number) => patch(id, { status: "approved", published_at: null }, "Pulled off the site");

  async function add() {
    if (!draft.title) return;
    const r = await fetch("/api/crud/portfolio_queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, status: "suggested" }),
    });
    if (r.ok) { toast.success("Queued"); setDraft({ kind: "milestone" }); load(); } else toast.error("Couldn't add");
  }
  async function del(id: number) {
    if (!confirm("Delete this item entirely?")) return;
    setRows((r) => r.filter((x) => x.id !== id));
    await fetch(`/api/crud/portfolio_queue?id=${id}`, { method: "DELETE" });
  }

  const pending = rows.filter((x) => x.status === "suggested" || x.status === "approved");
  const live = rows.filter((x) => x.status === "live");
  const rejected = rows.filter((x) => x.status === "rejected");

  const Item = (x: any, actions: React.ReactNode) => (
    <Card key={x.id} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-[11px] font-semibold uppercase tracking-wider", KIND_TONE[x.kind] ?? "text-muted-foreground")}>{x.kind}</span>
            {x.date_label && <span className="text-xs text-muted-foreground">{x.date_label}</span>}
            <span className="text-[11px] text-muted-foreground/60">via {x.source}</span>
          </div>
          <div className="mt-0.5 font-semibold">{x.title}</div>
          {x.hook && <div className="mt-1 text-sm text-muted-foreground">“{x.hook}”</div>}
          {x.detail && <div className="mt-1 text-sm text-muted-foreground/80">{x.detail}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_2fr_2fr_auto] md:items-end">
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Kind</label>
            <select className={fieldClass} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
              {KINDS.map((k) => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Title (site voice)</label>
            <input className={fieldClass} placeholder='e.g. "Aravalli Trail Half — 2:45"' value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Date label (optional)</label>
            <input className={fieldClass} placeholder="JUL 2026 · 21.1 KM · 2:45" value={draft.date_label ?? ""} onChange={(e) => setDraft({ ...draft, date_label: e.target.value })} />
          </div>
          <Button onClick={add}>+ Queue</Button>
        </div>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Awaiting your yes ({pending.length})</h2>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Queue clear. Mention a win to the bot, or queue one above.</p>
            ) : (
              <div className="space-y-3">
                {pending.map((x) => Item(x, (
                  <>
                    <Button size="sm" variant="good" onClick={() => publish(x.id)}>Publish</Button>
                    <Button size="sm" variant="ghost" onClick={() => reject(x.id)}>Skip</Button>
                  </>
                )))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Live on the site ({live.length})
              <a href="https://parth-index.vercel.app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline normal-case font-normal">view <ExternalLink className="h-3 w-3" /></a>
            </h2>
            {live.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing live from the queue yet — the static site stands on its own.</p>
            ) : (
              <div className="space-y-3">
                {live.map((x) => Item(x, (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => unpublish(x.id)}>Unpublish</Button>
                    <button onClick={() => del(x.id)} className="text-muted-foreground hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                  </>
                )))}
              </div>
            )}
          </section>

          {rejected.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skipped ({rejected.length})</summary>
              <div className="mt-3 space-y-3">
                {rejected.map((x) => Item(x, (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => publish(x.id)}>Publish anyway</Button>
                    <button onClick={() => del(x.id)} className="text-muted-foreground hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                  </>
                )))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
