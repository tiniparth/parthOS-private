"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TaskItem({
  id,
  title,
  due_date,
  done,
}: {
  id: string;
  title: string;
  due_date: string | null;
  done: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch("/api/tasks/done", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, done: !done }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <li style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", opacity: busy ? 0.5 : 1 }}>
      <input type="checkbox" checked={done} onChange={toggle} disabled={busy} style={{ width: 18, height: 18, cursor: "pointer" }} />
      <span style={{ textDecoration: done ? "line-through" : "none", opacity: done ? 0.5 : 1 }}>
        {title}
        {due_date && <span style={{ color: "#ffb454", marginLeft: 8, fontSize: 13 }}>· {due_date}</span>}
      </span>
    </li>
  );
}
