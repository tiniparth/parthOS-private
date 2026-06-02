"use client";
import { useEffect, useState } from "react";

export default function ProfileEditor() {
  const [id, setId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/crud/profile")
      .then((r) => r.json())
      .then((j) => {
        const row = j.rows?.[0];
        if (row) { setId(row.id); setContent(row.content ?? ""); }
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaved(false);
    await fetch("/api/crud/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content }),
    });
    setSaved(true);
  }

  if (loading) return <p style={{ opacity: 0.5 }}>Loading profile…</p>;

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => { setContent(e.target.value); setSaved(false); }}
        style={{ width: "100%", minHeight: 320, padding: 14, borderRadius: 10, border: "1px solid #333", background: "#0f0f11", color: "#e8e8ea", fontSize: 14, fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" }}
      />
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={save} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#4f7cff", color: "#fff", cursor: "pointer" }}>Save profile</button>
        {saved && <span style={{ color: "#3ecf8e", fontSize: 14 }}>Saved ✓ — the assistant uses this on every message.</span>}
      </div>
    </div>
  );
}
