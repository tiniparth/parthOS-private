import { isGmailConnected, triageInbox } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export default async function MailPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const sp = await searchParams;
  const connected = await isGmailConnected();

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 className="page-title">Mail</h1>
        {connected && <a href="/api/google/auth" className="logout">Reconnect</a>}
      </div>

      {sp?.error && <p style={{ color: "var(--danger)" }}>Connection error: {sp.error}. Try again.</p>}
      {sp?.connected && <p style={{ color: "var(--good)" }}>Gmail connected ✓</p>}

      {!connected ? (
        <div className="card">
          <h2>Connect your inbox</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Read-only access to parth@letsworkwise.com. Parth OS will triage your mail by importance using what it knows about you — clients and real people surface, marketing sinks.
          </p>
          <a href="/api/google/auth" className="btn" style={{ display: "inline-block", textDecoration: "none" }}>Connect Gmail →</a>
        </div>
      ) : (
        <Triaged />
      )}
    </>
  );
}

async function Triaged() {
  const mail = await triageInbox();
  const high = mail.filter((m) => m.importance === "high");
  const low = mail.filter((m) => m.importance !== "high");

  return (
    <>
      <p className="eyebrow" style={{ marginBottom: 12 }}>Needs attention · {high.length}</p>
      {high.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {high.map((m, i) => (
            <div key={i} className="row-item">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong>{m.subject || "(no subject)"}</strong>
                {m.needs_reply && <span className="chip" style={{ color: "var(--warn)" }}>reply</span>}
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{m.from}</div>
              <div className="faint" style={{ fontSize: 13, marginTop: 4 }}>{m.why}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ marginBottom: 24 }}>Nothing urgent. 🎉</p>
      )}

      <details>
        <summary className="muted" style={{ cursor: "pointer" }}>Lower priority ({low.length})</summary>
        <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
          {low.map((m, i) => (
            <li key={i} className="divider" style={{ padding: "7px 0", fontSize: 14 }}>
              <span className="faint">{m.from.replace(/<.*>/, "").trim()}</span> — {m.subject}
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
