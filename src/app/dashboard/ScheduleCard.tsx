import Link from "next/link";
import { Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { googleConnected } from "@/lib/google";
import { listUpcoming } from "@/lib/calendar";
import { getSetting } from "@/lib/settings";
import ScheduleList from "./ScheduleList";

export default async function ScheduleCard() {
  const connected = await googleConnected();
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" /> Schedule · today
      </div>
      {!connected ? (
        <p className="text-sm text-muted-foreground">Connect Google in <Link href="/dashboard/mail" className="text-primary">Mail</Link>.</p>
      ) : (
        await (async () => {
          const [events, statusRaw] = await Promise.all([listUpcoming(0), getSetting("event_status")]);
          let status: Record<string, string> = {};
          try { status = JSON.parse(statusRaw || "{}"); } catch { /* */ }
          return <ScheduleList events={events} initialStatus={status} />;
        })()
      )}
    </Card>
  );
}
