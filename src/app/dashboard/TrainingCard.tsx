"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Col = { label: string; session: string; hint: string } | null;

export default function TrainingCard({
  race, raceDate, today, tomorrow, canMark, doneToday,
}: {
  race: string; raceDate: string; today: Col; tomorrow: Col; canMark: boolean; doneToday: boolean;
}) {
  const [done, setDone] = useState(doneToday);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const optimistic = !done;
    setDone(optimistic);
    try {
      const res = await fetch("/api/habits/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habit: "running" }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      setDone(!!j.done);
      toast.success(j.done ? "Run logged 🏃🔥" : "Unmarked");
    } catch {
      setDone(!optimistic);
      toast.error("Couldn't update");
    } finally {
      setBusy(false);
    }
  }

  const Box = ({ heading, col, accent }: { heading: string; col: Col; accent?: boolean }) => (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {heading}{col ? ` · ${col.label}` : ""}
      </div>
      {col ? (
        <>
          <div className={cn("mt-0.5 leading-tight", accent ? "font-semibold" : "font-medium")}>{col.session}</div>
          {col.hint && <div className="text-xs text-muted-foreground">{col.hint}</div>}
        </>
      ) : (
        <div className="mt-0.5 text-sm text-muted-foreground">Rest / no session</div>
      )}
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🏅 {race}</span>
        <span className="text-xs text-muted-foreground">{raceDate}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Box heading="🏃 Today" col={today} accent />
        <Box heading="👟 Tomorrow" col={tomorrow} />
      </div>
      {canMark && (
        <button
          onClick={toggle}
          disabled={busy}
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60",
            done ? "border-good bg-good text-[#04231a]" : "border-border text-muted-foreground hover:border-good hover:text-good"
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} /> {done ? "Today's run done" : "Mark today's run done"}
        </button>
      )}
    </div>
  );
}
