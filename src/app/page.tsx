import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 600, margin: "96px auto", padding: 24 }}>
      <h1 style={{ fontSize: 42, marginBottom: 8 }}>Parth OS<span style={{ color: "var(--accent)" }}>.</span></h1>
      <p className="muted" style={{ fontSize: 17 }}>
        Your personal operating system. Capture anything on Telegram — <strong style={{ color: "var(--text)" }}>@tiniparth_bot</strong>.
      </p>
      <Link href="/dashboard" className="btn" style={{ display: "inline-block", marginTop: 18, textDecoration: "none" }}>
        Open dashboard →
      </Link>
    </main>
  );
}
