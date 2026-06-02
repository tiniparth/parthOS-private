"use client";
import { useEffect, useState, useCallback } from "react";

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
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {col.options!.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (col.type === "textarea") {
    return <textarea style={{ minHeight: 58 }} value={value ?? ""} placeholder={col.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <input
      type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
      value={value ?? ""}
      placeholder={col.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function serialize(col: Col, v: any) {
  if (v === "" || v == null) return null;
  if (col.type === "number") return Number(v);
  if (col.type === "tags") return String(v).split(",").map((s) => s.trim()).filter(Boolean);
  return v;
}
function display(col: Col, v: any) {
  if (v == null || v === "") return "—";
  if (col.type === "tags" && Array.isArray(v)) return v.join(", ");
  return String(v);
}

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
    await fetch(`/api/crud/${table}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body(draft)) });
    setDraft({}); load();
  }
  async function saveEdit() {
    await fetch(`/api/crud/${table}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...body(editDraft) }) });
    setEditId(null); setEditDraft({}); load();
  }
  async function del(id: string) {
    if (!confirm("Delete this?")) return;
    await fetch(`/api/crud/${table}?id=${id}`, { method: "DELETE" });
    load();
  }

  const grid = (extra: number) => ({ display: "grid", gridTemplateColumns: `repeat(${columns.length}, 1fr)${" auto".repeat(extra)}`, gap: 10, alignItems: "end" });

  return (
    <div>
      {/* add new */}
      <div className="card" style={{ ...grid(1), marginBottom: 18 }}>
        {columns.map((c) => (
          <div key={c.key}>
            <label className="field-label">{c.label}</label>
            <Field col={c} value={draft[c.key]} onChange={(v) => setDraft((d) => ({ ...d, [c.key]: v }))} />
          </div>
        ))}
        <button className="btn" onClick={add}>+ Add</button>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">Nothing yet — add one above.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => (
            <div key={r.id} className="row-item">
              {editId === r.id ? (
                <div style={grid(2)}>
                  {columns.map((c) => (
                    <div key={c.key}>
                      <label className="field-label">{c.label}</label>
                      <Field col={c} value={editDraft[c.key]} onChange={(v) => setEditDraft((d) => ({ ...d, [c.key]: v }))} />
                    </div>
                  ))}
                  <button className="btn btn-good btn-sm" onClick={saveEdit}>Save</button>
                  <button className="btn-ghost btn-sm" onClick={() => setEditId(null)} style={{ cursor: "pointer" }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 16, fontSize: 14 }}>
                    {columns.map((c) => (
                      <span key={c.key}><span className="faint" style={{ fontSize: 12 }}>{c.label}: </span>{display(c, r[c.key])}</span>
                    ))}
                  </div>
                  <button
                    className="btn-edit-ghost"
                    onClick={() => { setEditId(r.id); const ed: Record<string, any> = {}; columns.forEach((c) => (ed[c.key] = c.type === "tags" && Array.isArray(r[c.key]) ? r[c.key].join(", ") : r[c.key])); setEditDraft(ed); }}
                  >Edit</button>
                  <button className="btn-danger-ghost" onClick={() => del(r.id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
