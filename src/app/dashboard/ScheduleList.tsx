"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ScheduleList({ events, initialStatus }: { events: any[]; initialStatus: Record<string, string> }) {
  const [status, setStatus] = useState<Record<string, string>>(initialStatus || {});

  function toggle(id: string) {
    const done = !status[id];
    setStatus((s) => { const n = { ...s }; if (done) n[id] = "done"; else delete n[id]; return n; });
    fetch("/api/event-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, done }) });
  }

  if (!events.length) return <p className="text-sm text-muted-foreground">No events today. Clear runway. 🛫</p>;

  return (
    <ul className="space-y-2">
      {events.map((e) => {
        const done = !!status[e.id];
        return (
          <li key={e.id} className="flex items-center gap-2.5 text-sm">
            <button
              onClick={() => toggle(e.id)}
              className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors", done ? "border-good bg-good text-[#04231a]" : "border-muted-foreground hover:border-good")}
              aria-label="mark attended"
            >
              {done && <Check className="h-3 w-3" strokeWidth={3} />}
            </button>
            <span className="w-16 shrink-0 text-primary">{e.allDay ? "all day" : e.time}</span>
            <span className={cn(done && "line-through opacity-50")}>{e.summary}</span>
          </li>
        );
      })}
    </ul>
  );
}
