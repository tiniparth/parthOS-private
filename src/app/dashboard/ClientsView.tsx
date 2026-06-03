"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STAGES = ["Qualify", "Discovery", "Spec", "Prototype", "Demo", "Commercial", "Close", "Production"];
const stageIdx = (s: string) => { const i = STAGES.indexOf(s); return i < 0 ? 99 : i; };

type Client = { id: string; name: string; domain?: string; stage?: string; next_action?: string; blocker?: string; contact?: string; priority?: string; last_contact?: string };

export default function ClientsView() {
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<any>({ stage: "Discovery" });
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>({});

  const load = useCallback(async () => {
    const r = await fetch("/api/crud/clients");
    const j = await r.json();
    setRows(j.rows ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!draft.name) return;
    const r = await fetch("/api/crud/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    if (r.ok) { toast.success("Client added"); setDraft({ stage: "Discovery" }); load(); } else toast.error("Couldn't add");
  }
  async function save() {
    const r = await fetch("/api/crud/clients", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...edit }) });
    if (r.ok) { toast.success("Saved"); setEditId(null); load(); } else toast.error("Couldn't save");
  }
  async function del(id: string) {
    if (!confirm("Remove this client?")) return;
    setRows((r) => r.filter((c) => c.id !== id));
    await fetch(`/api/crud/clients?id=${id}`, { method: "DELETE" });
    toast.success("Removed");
  }

  const sorted = [...rows].sort((a, b) => stageIdx(a.stage || "") - stageIdx(b.stage || ""));

  const F = ({ k, label, type = "text", opts }: { k: string; label: string; type?: string; opts?: string[] }) => (
    <div>
      <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">{label}</label>
      {opts ? (
        <select className={fieldClass} value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}><option value="">—</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>
      ) : (
        <input className={fieldClass} type={type} value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* add */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_1fr_1.6fr_auto] md:items-end">
          <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Client</label><input className={fieldClass} placeholder="Name" value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Stage</label><select className={fieldClass} value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value })}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Next action</label><input className={fieldClass} placeholder="What's next…" value={draft.next_action ?? ""} onChange={(e) => setDraft({ ...draft, next_action: e.target.value })} /></div>
          <Button onClick={add}>+ Add</Button>
        </div>
      </Card>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No clients yet — add one above.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((c) => (
            <Card key={c.id} className="p-4">
              {editId === c.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <F k="name" label="Client" />
                    <F k="stage" label="Stage" opts={STAGES} />
                    <F k="priority" label="Priority" opts={["low", "med", "high"]} />
                    <F k="contact" label="Contact" />
                    <F k="last_contact" label="Last contact" type="date" />
                    <F k="domain" label="Domain" />
                  </div>
                  <F k="next_action" label="Next action" />
                  <F k="blocker" label="Blocker" />
                  <div className="flex gap-2"><Button size="sm" variant="good" onClick={save}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button></div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{c.stage || "—"}</span>
                      {c.priority === "high" && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs text-danger">priority</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditId(c.id); setEdit({ name: c.name, domain: c.domain, stage: c.stage, next_action: c.next_action, blocker: c.blocker, contact: c.contact, priority: c.priority, last_contact: c.last_contact }); }} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => del(c.id)} className="text-muted-foreground hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {c.domain && <div className="mt-0.5 text-xs text-muted-foreground">{c.domain}</div>}
                  {c.next_action && <div className="mt-2 text-sm"><span className="text-muted-foreground">Next: </span>{c.next_action}</div>}
                  {c.blocker && <div className="mt-1 text-sm text-warn"><span className="opacity-70">Blocker: </span>{c.blocker}</div>}
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    {c.contact && <span>👤 {c.contact}</span>}
                    {c.last_contact && <span>🕑 last: {c.last_contact}</span>}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
