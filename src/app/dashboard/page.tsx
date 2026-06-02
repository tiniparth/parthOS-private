import Link from "next/link";
import CrudTable from "./CrudTable";
import { loadDashboard } from "@/lib/dashboard";
import { googleConnected } from "@/lib/google";
import { unreadCount } from "@/lib/gmail";
import { listUpcoming } from "@/lib/calendar";

export const dynamic = "force-dynamic";

const TRACKED_HABITS = ["running", "reading", "yoga", "journalling"];

export default async function Dashboard() {
  const d = await loadDashboard();
  const connected = await googleConnected();
  const [unread, events] = connected
    ? await Promise.all([unreadCount(), listUpcoming(1)])
    : [0, []];

  const open = d.tasks.filter((t) => t.status !== "done");
  const dueToday = open.filter((t) => t.due_date && t.due_date <= d.today).length;
  const spendTotal = d.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const habitCount: Record<string, number> = {};
  for (const h of d.habitLogs) habitCount[h.habit.toLowerCase()] = (habitCount[h.habit.toLowerCase()] || 0) + 1;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
        <h1 className="page-title">Today</h1>
        <span className="faint" style={{ fontSize: 14 }}>{d.today}</span>
      </div>

      {/* clarity: the day's vital signs */}
      <div className="stats" style={{ marginBottom: 22 }}>
        <div className="stat"><div className="num" style={{ color: dueToday ? "var(--warn)" : undefined }}>{dueToday}</div><div className="lbl">due today</div></div>
        <div className="stat"><div className="num">{open.length}</div><div className="lbl">open tasks</div></div>
        <div className="stat"><div className="num">{connected ? unread : "—"}</div><div className="lbl">unread mail</div></div>
        <div className="stat"><div className="num">₹{spendTotal}</div><div className="lbl">spent / month</div></div>
      </div>

      {/* Calendar */}
      <section className="card">
        <h2>📅 Schedule · today + tomorrow</h2>
        {!connected ? (
          <p className="muted" style={{ margin: 0 }}>Connect Google to see your calendar — <Link href="/dashboard/mail" style={{ color: "var(--accent)" }}>Mail → Connect</Link>.</p>
        ) : events.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No events. Clear runway. 🛫</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {events.map((e, i) => (
              <li key={i} className="divider" style={{ display: "flex", gap: 12, padding: "7px 0", fontSize: 14 }}>
                <span style={{ color: "var(--accent)", minWidth: 78 }}>{e.allDay ? "all day" : e.time}</span>
                <span>{e.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Email */}
      <section className="card">
        <h2>📨 Inbox</h2>
        {connected ? (
          <p style={{ margin: 0 }}>
            <strong>{unread}</strong> unread.{" "}
            <Link href="/dashboard/mail" style={{ color: "var(--accent)" }}>Open triage →</Link>
          </p>
        ) : (
          <p className="muted" style={{ margin: 0 }}><Link href="/dashboard/mail" style={{ color: "var(--accent)" }}>Connect Gmail →</Link></p>
        )}
      </section>

      {/* Tasks — full inline CRUD */}
      <section style={{ marginBottom: 8 }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>Tasks · {open.length} open</p>
        <CrudTable
          table="tasks"
          columns={[
            { key: "title", label: "Title", type: "text", placeholder: "What needs doing…" },
            { key: "status", label: "Status", type: "select", options: ["open", "done"] },
            { key: "priority", label: "Priority", type: "select", options: ["low", "med", "high"] },
            { key: "due_date", label: "Due", type: "date" },
          ]}
        />
      </section>

      {/* Expenses */}
      <section style={{ margin: "24px 0 8px" }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>Expenses · ₹{spendTotal} this month</p>
        <CrudTable
          table="expenses"
          columns={[
            { key: "amount", label: "₹", type: "number", placeholder: "amount" },
            { key: "item", label: "Item", type: "text", placeholder: "lunch…" },
            { key: "category", label: "Category", type: "select", options: ["food", "travel", "work", "personal", "other"] },
            { key: "spent_on", label: "Date", type: "date" },
          ]}
        />
      </section>

      {/* Habits */}
      <section style={{ margin: "24px 0 8px" }}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>Habits · last 7 days</p>
        <div className="stats" style={{ marginBottom: 12 }}>
          {TRACKED_HABITS.map((h) => (
            <div key={h} className="stat">
              <div className={"num" + (habitCount[h] ? " good" : "")}>{habitCount[h] || 0}×</div>
              <div className="lbl">{h}</div>
            </div>
          ))}
        </div>
        <CrudTable
          table="habit_logs"
          columns={[
            { key: "habit", label: "Habit", type: "select", options: TRACKED_HABITS },
            { key: "done_on", label: "Done on", type: "date" },
            { key: "note", label: "Note", type: "text", placeholder: "optional" },
          ]}
        />
      </section>
    </>
  );
}
