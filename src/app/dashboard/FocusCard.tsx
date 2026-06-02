"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Target } from "lucide-react";

export default function FocusCard({ suggestion = "", initialFocus = "" }: { suggestion?: string; initialFocus?: string }) {
  const [focus, setFocus] = useState(initialFocus);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");

  const display = focus || suggestion;

  async function save() {
    setFocus(val);
    setEditing(false);
    await fetch("/api/focus", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ focus: val }) });
    toast.success("Focus set");
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <Target className="h-5 w-5 shrink-0 text-primary" />
      {editing ? (
        <>
          <input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="What's your #1 focus today?"
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <button onClick={save} className="text-xs font-medium text-primary">Save</button>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <span className="mr-2 text-xs uppercase tracking-wide text-muted-foreground">Focus</span>
            {display ? <span className="font-medium">{display}</span> : <span className="text-muted-foreground">Set today's focus…</span>}
          </div>
          <button onClick={() => { setVal(focus || suggestion); setEditing(true); }} className="text-xs text-muted-foreground hover:text-foreground">
            {display ? "edit" : "set"}
          </button>
        </>
      )}
    </div>
  );
}
