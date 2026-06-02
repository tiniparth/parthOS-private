import Link from "next/link";
import { Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { googleConnected } from "@/lib/google";
import { unreadCount } from "@/lib/gmail";
import { getSetting } from "@/lib/settings";

export default async function InboxCard() {
  const connected = await googleConnected();
  return (
    <Card className="p-5">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Mail className="h-3.5 w-3.5" /> Needs attention
      </div>
      {!connected ? (
        <Link href="/dashboard/mail" className="text-sm text-primary">Connect Gmail →</Link>
      ) : (
        await (async () => {
          const [unread, triageRaw] = await Promise.all([unreadCount(), getSetting("triage_cache")]);
          let high: any[] = [];
          try { const o = JSON.parse(triageRaw || "{}"); if (o.at && Date.now() - o.at < 30 * 60 * 1000) high = (o.mail || []).filter((m: any) => m.importance === "high"); } catch { /* */ }
          if (high.length === 0) {
            return <p className="text-sm"><span className="font-semibold">{unread}</span> unread · <Link href="/dashboard/mail" className="text-primary">open triage →</Link></p>;
          }
          return (
            <ul className="space-y-1.5 text-sm">
              {high.slice(0, 4).map((m, i) => (
                <li key={i} className="flex flex-col">
                  <span>{m.subject}</span>
                  <span className="text-xs text-muted-foreground">{(m.from || "").replace(/<.*>/, "").trim()}{m.needs_reply ? " · ↩ reply" : ""}</span>
                </li>
              ))}
            </ul>
          );
        })()
      )}
    </Card>
  );
}
