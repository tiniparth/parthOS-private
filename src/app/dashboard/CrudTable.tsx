"use client";
import { useEffect, useState, useCallback } from "react";

export type Col = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "tags" | "textarea";
  options?: string[];
  placeholder?: string;
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px", borderRadius: 8, border: "1px solid #333",
  background: "#0f0f11", color: "#e8e8ea", fontSize: 14, width: "100%", boxSizing: "border-box",
};

function toField(col: Col, value: any, onChange: (v: any) => void) {
  if (col.type === "select") {
    return (
      <select style={inputStyle} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {col.options!.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (col.type === "textarea") {
    return <textarea style={{ ...inputStyle, minHeight: 60 }} value={value ?? ""} placeholder={col.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <input
      style={inputStyle}
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

  function body(src: Record<string, any>) {
    const out: Record<string, any> = {};
    for (const c of columns) out[c.key] = serialize(c, src[c.key]);
    return out;
  }

  async function add() {
    if (!columns.some((c) => draft[c.key])) return;
    await fetch(`/api/crud/${table}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body(draft)) });
    setDraft({});
    load();
  }

  async function saveEdit() {
    await fetch(`/api/crud/${table}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...body(editDraft) }) });
    setEditId(null);
    setEditDraft({});
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this?")) return;
    await fetch(`/api/crud/${table}?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      {/* Add new */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, 1fr) auto`, gap: 8, alignItems: "end", marginBottom: 16 }}>
        {columns.map((c) => (
          <div key={c.key}>
            <label style={{ fontSize: 12, opacity: 0.5, display: "block", marginBottom: 4 }}>{c.label}</label>
            {toField(c, draft[c.key], (v) => setDraft((d) => ({ ...d, [c.key]: v })))}
          </div>
        ))}
        <button onClick={add} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#4f7cff", color: "#fff", cursor: "pointer", fontSize: 14 }}>+ Add</button>
      </div>

      {loading ? (
        <p style={{ opacity: 0.5 }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ opacity: 0.5 }}>Nothing yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ background: "#161618", border: "1px solid #262629", borderRadius: 10, padding: "10px 12px" }}>
              {editId === r.id ? (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, 1fr) auto auto`, gap: 8, alignItems: "end" }}>
                  {columns.map((c) => (
                    <div key={c.key}>
                      <label style={{ fontSize: 12, opacity: 0.5, display: "block", marginBottom: 4 }}>{c.label}</label>
                      {toField(c, editDraft[c.key], (v) => setEditDraft((d) => ({ ...d, [c.key]: v })))}
                    </div>
                  ))}
                  <button onClick={saveEdit} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#3ecf8e", color: "#04231a", cursor: "pointer" }}>Save</button>
                  <button onClick={() => setEditId(null)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#aaa", cursor: "pointer" }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 14, fontSize: 14 }}>
                    {columns.map((c) => (
                      <span key={c.key}>
                        <span style={{ opacity: 0.4, fontSize: 12 }}>{c.label}: </span>
                        {display(c, r[c.key])}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => { setEditId(r.id); const ed: Record<string, any> = {}; columns.forEach((c) => (ed[c.key] = c.type === "tags" && Array.isArray(r[c.key]) ? r[c.key].join(", ") : r[c.key])); setEditDraft(ed); }}
                    style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #333", background: "transparent", color: "#9bb4ff", cursor: "pointer", fontSize: 13 }}
                  >Edit</button>
                  <button onClick={() => del(r.id)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #3a2222", background: "transparent", color: "#ff7b7b", cursor: "pointer", fontSize: 13 }}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
