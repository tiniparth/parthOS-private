import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 620, margin: "72px auto", padding: 24, lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 40, marginBottom: 8 }}>🧠 Parth OS</h1>
      <p style={{ opacity: 0.8 }}>
        Your personal assistant. Talk to it on Telegram — <strong>@tiniparth_bot</strong>.
      </p>
      <Link
        href="/dashboard"
        style={{ display: "inline-block", marginTop: 16, padding: "10px 18px", borderRadius: 10, background: "#4f7cff", color: "#fff", textDecoration: "none" }}
      >
        Open dashboard →
      </Link>
    </main>
  );
}
