"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function QuickCapture() {
  const router = useRouter();
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!v.trim()) return;
    setBusy(true);
    const res = await fetch("/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: v }),
    });
    const j = await res.json();
    if (res.ok) {
      toast.success(j.reply || "Done", { duration: 5000 });
      setV("");
      router.refresh();
    } else {
      toast.error(j.reply || "Couldn't process that");
    }
    setBusy(false);
  }

  return (
    <div className="flex gap-2">
      <input
        className={cn(fieldClass, "h-11")}
        placeholder="+ Add or ask anything…  e.g. “spent 200 on lunch”, “block 3pm tmrw for Empower”"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        disabled={busy}
      />
      <button
        onClick={send}
        disabled={busy}
        className="rounded-lg bg-primary px-5 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "…" : "Send"}
      </button>
    </div>
  );
}
