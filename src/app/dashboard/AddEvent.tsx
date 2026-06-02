"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";

const local = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

export default function AddEvent() {
  const router = useRouter();
  const [d, setD] = useState<any>({ date: local(), time: "10:00", duration: 30 });
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!d.summary || !d.date || !d.time) return;
    setBusy(true);
    const when = `${d.date}T${d.time}:00+05:30`;
    const attendees = String(d.invite || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    const res = await fetch("/api/calendar/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary: d.summary, when, duration_min: Number(d.duration) || 30, attendees }) });
    const j = await res.json();
    if (res.ok && j.ok) { toast.success(attendees.length ? `Added + invited ${attendees.length}` : "Added to your calendar"); setD({ date: local(), time: "10:00", duration: 30 }); router.refresh(); }
    else toast.error("Couldn't add the event");
    setBusy(false);
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[2fr_1.2fr_1fr_0.8fr_auto] md:items-end">
        <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Event</label><input className={fieldClass} placeholder="Meeting…" value={d.summary ?? ""} onChange={(e) => setD({ ...d, summary: e.target.value })} /></div>
        <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Date</label><input className={fieldClass} type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></div>
        <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Time</label><input className={fieldClass} type="time" value={d.time} onChange={(e) => setD({ ...d, time: e.target.value })} /></div>
        <div><label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Min</label><input className={fieldClass} type="number" value={d.duration} onChange={(e) => setD({ ...d, duration: e.target.value })} /></div>
        <Button onClick={add} disabled={busy}>{busy ? "…" : "+ Add"}</Button>
      </div>
      <div className="mt-3">
        <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Invite (emails, comma-separated — optional)</label>
        <input className={fieldClass} placeholder="siddharth@letsworkwise.com, jamal@…" value={d.invite ?? ""} onChange={(e) => setD({ ...d, invite: e.target.value })} />
      </div>
    </Card>
  );
}
