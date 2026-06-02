"use client";
import { useState } from "react";

export default function Login() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (res.ok) window.location.href = "/dashboard";
    else {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: "120px auto", padding: 24 }}>
      <h1 style={{ fontSize: 28 }}>🧠 Parth OS</h1>
      <p style={{ opacity: 0.7, marginBottom: 20 }}>Enter your passcode to view the dashboard.</p>
      <form onSubmit={submit}>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="passcode"
          autoFocus
          style={{
            width: "100%", padding: "12px 14px", fontSize: 16, borderRadius: 10,
            border: "1px solid #333", background: "#161618", color: "#e8e8ea", boxSizing: "border-box",
          }}
        />
        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%", marginTop: 12, padding: "12px 14px", fontSize: 16, borderRadius: 10,
            border: "none", background: "#4f7cff", color: "#fff", cursor: "pointer", opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "…" : "Enter"}
        </button>
        {error && <p style={{ color: "#ff6b6b", marginTop: 12 }}>Wrong passcode.</p>}
      </form>
    </main>
  );
}
