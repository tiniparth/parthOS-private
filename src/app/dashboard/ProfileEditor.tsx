"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function ProfileEditor() {
  const [id, setId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/crud/profile")
      .then((r) => r.json())
      .then((j) => {
        const row = j.rows?.[0];
        if (row) { setId(row.id); setContent(row.content ?? ""); }
        setLoading(false);
      });
  }, []);

  async function save() {
    const res = await fetch("/api/crud/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content }),
    });
    if (res.ok) toast.success("Profile saved — the assistant uses this every message");
    else toast.error("Couldn't save");
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading profile…</p>;

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full min-h-[340px] rounded-xl border border-border bg-input p-4 text-sm leading-relaxed text-foreground focus:outline-none focus:border-primary transition-colors"
      />
      <div className="mt-3">
        <Button onClick={save}>Save profile</Button>
      </div>
    </div>
  );
}
