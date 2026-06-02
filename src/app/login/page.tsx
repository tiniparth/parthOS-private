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
    else { setError(true); setBusy(false); }
  }

  return (
    <main style={{ maxWidth: 340, margin: "140px auto", padding: 24 }}>
      <h1 style={{ fontSize: 26, margin: 0 }}>Parth OS<span style={{ color: "var(--accent)" }}>.</span></h1>
      <p className="muted" style={{ marginBottom: 22 }}>Enter your passcode.</p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input type="password" value={passcode} autoFocus placeholder="passcode" onChange={(e) => setPasscode(e.target.value)} />
        <button className="btn" type="submit" disabled={busy}>{busy ? "…" : "Enter"}</button>
        {error && <p style={{ color: "var(--danger)", margin: 0, fontSize: 14 }}>Wrong passcode.</p>}
      </form>
    </main>
  );
}
