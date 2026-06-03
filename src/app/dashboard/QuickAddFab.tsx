"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function QuickAddFab() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!v.trim()) return;
    setBusy(true);
    const res = await fetch("/api/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: v }) });
    const j = await res.json();
    if (res.ok) { toast.success(j.reply || "Done", { duration: 5000 }); setV(""); setOpen(false); router.refresh(); }
    else toast.error(j.reply || "Couldn't process that");
    setBusy(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick add"
        className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-black/40 transition-transform hover:scale-105 active:scale-95 md:left-[15.5rem]"
      >
        <Plus className="h-7 w-7" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative m-3 w-full max-w-lg rounded-2xl border border-border bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Add anything</span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <input
              autoFocus
              className={cn(fieldClass, "h-12")}
              placeholder="“spent 200 on lunch”, “task call Jamal tmrw”, “block 3pm for Bliss”"
              value={v}
              onChange={(e) => setV(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={busy}
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex gap-2 text-xs">
                <Link href="/dashboard/tasks" onClick={() => setOpen(false)} className="rounded-full bg-muted px-3 py-1 text-muted-foreground hover:text-foreground">Task</Link>
                <Link href="/dashboard/expenses" onClick={() => setOpen(false)} className="rounded-full bg-muted px-3 py-1 text-muted-foreground hover:text-foreground">Expense</Link>
                <Link href="/dashboard/calendar" onClick={() => setOpen(false)} className="rounded-full bg-muted px-3 py-1 text-muted-foreground hover:text-foreground">Event</Link>
              </div>
              <button onClick={send} disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50">{busy ? "…" : "Add"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
