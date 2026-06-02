import Link from "next/link";
import { isGmailConnected, triageInbox } from "@/lib/gmail";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MailPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const sp = await searchParams;
  const connected = await isGmailConnected();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Mail</h1>
        {connected && <a href="/api/google/auth" className="text-xs text-muted-foreground hover:text-foreground">Reconnect</a>}
      </div>

      {sp?.error && <p className="text-sm text-danger">Connection error: {sp.error}. Try again.</p>}
      {sp?.connected && <p className="text-sm text-good">Gmail connected ✓</p>}

      {!connected ? (
        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Connect your inbox</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-prose">
            Read-only access to parth@letsworkwise.com. Parth OS triages your mail by importance using what it knows about you — clients and real people surface, marketing sinks.
          </p>
          <a href="/api/google/auth"><Button>Connect Gmail →</Button></a>
        </Card>
      ) : (
        <Triaged />
      )}
    </div>
  );
}

async function Triaged() {
  const mail = await triageInbox();
  const high = mail.filter((m) => m.importance === "high");
  const low = mail.filter((m) => m.importance !== "high");

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Needs attention · {high.length}</p>
      {high.length ? (
        <div className="space-y-2">
          {high.map((m, i) => (
            <Card key={i} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <strong className="text-sm">{m.subject || "(no subject)"}</strong>
                {m.needs_reply && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-warn">reply</span>}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{m.from}</div>
              <div className="mt-1 text-xs text-muted-foreground/70">{m.why}</div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing urgent. 🎉</p>
      )}

      <details className="pt-2">
        <summary className="cursor-pointer text-sm text-muted-foreground">Lower priority ({low.length})</summary>
        <ul className="mt-2 space-y-1">
          {low.map((m, i) => (
            <li key={i} className="border-b border-border/60 py-1.5 text-sm">
              <span className="text-muted-foreground/70">{m.from.replace(/<.*>/, "").trim()}</span> — {m.subject}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
