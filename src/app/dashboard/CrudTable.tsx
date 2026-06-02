"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Col = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "tags" | "textarea";
  options?: string[];
  placeholder?: string;
};

function Field({ col, value, onChange }: { col: Col; value: any; onChange: (v: any) => void }) {
  if (col.type === "select") {
    return (
      <select className={fieldClass} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {col.options!.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (col.type === "textarea") {
    return <textarea className={cn(fieldClass, "h-auto min-h-[60px] py-2")} value={value ?? ""} placeholder={col.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <input
      className={fieldClass}
      type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
      value={value ?? ""}
      placeholder={col.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

const serialize = (col: Col, v: any) => {
  if (v === "" || v == null) return null;
  if (col.type === "number") return Number(v);
  if (col.type === "tags") return String(v).split(",").map((s) => s.trim()).filter(Boolean);
  return v;
};
const display = (col: Col, v: any) => {
  if (v == null || v === "") return "—";
  if (col.type === "tags" && Array.isArray(v)) return v.join(", ");
  return String(v);
};

export default function CrudTable({ table, columns }: { table: string; columns: Col[] }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/crud/${table}`);
    const j = await res.json();
    setRows(j.rows ?? []);
    setLoading(false);
  }, [table]);
  useEffect(() => { load(); }, [load]);

  const body = (src: Record<string, any>) => {
    const out: Record<string, any> = {};
    for (const c of columns) out[c.key] = serialize(c, src[c.key]);
    return out;
  };

  async function add() {
    if (!columns.some((c) => draft[c.key])) return;
    const res = await fetch(`/api/crud/${table}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body(draft)) });
    if (res.ok) { toast.success("Added"); setDraft({}); load(); } else toast.error("Couldn't add");
  }
  async function saveEdit() {
    const res = await fetch(`/api/crud/${table}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...body(editDraft) }) });
    if (res.ok) { toast.success("Saved"); setEditId(null); setEditDraft({}); load(); } else toast.error("Couldn't save");
  }
  async function del(id: string) {
    if (!confirm("Delete this?")) return;
    const res = await fetch(`/api/crud/${table}?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); load(); } else toast.error("Couldn't delete");
  }

  return (
    <div className="space-y-3">
      {/* add new */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(120px,1fr))] items-end">
          {columns.map((c) => (
            <div key={c.key} className="min-w-0">
              <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</label>
              <Field col={c} value={draft[c.key]} onChange={(v) => setDraft((d) => ({ ...d, [c.key]: v }))} />
            </div>
          ))}
          <Button onClick={add} className="shrink-0">+ Add</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet — add one above.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card px-4 py-3">
              {editId === r.id ? (
                <div className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(120px,1fr))] items-end">
                  {columns.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</label>
                      <Field col={c} value={editDraft[c.key]} onChange={(v) => setEditDraft((d) => ({ ...d, [c.key]: v }))} />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button variant="good" size="sm" onClick={saveEdit}>Save</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 flex-wrap gap-x-5 gap-y-1 text-sm min-w-0">
                    {columns.map((c) => (
                      <span key={c.key} className="truncate">
                        <span className="text-xs text-muted-foreground">{c.label}: </span>
                        {display(c, r[c.key])}
                      </span>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary" onClick={() => { setEditId(r.id); const ed: Record<string, any> = {}; columns.forEach((c) => (ed[c.key] = c.type === "tags" && Array.isArray(r[c.key]) ? r[c.key].join(", ") : r[c.key])); setEditDraft(ed); }}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => del(r.id)}>Delete</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
