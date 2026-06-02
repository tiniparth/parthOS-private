import { loadDashboard } from "@/lib/dashboard";
import TaskItem from "./TaskItem";

export const dynamic = "force-dynamic";

const TRACKED_HABITS = ["running", "reading", "yoga", "journalling"];

export default async function Dashboard() {
  const d = await loadDashboard();

  const open = d.tasks.filter((t) => t.status !== "done");
  const done = d.tasks.filter((t) => t.status === "done").slice(0, 8);
  const dueToday = open.filter((t) => t.due_date && t.due_date <= d.today).length;

  const spendTotal = d.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const todaySpend = d.expenses.filter((e) => e.spent_on === d.today).reduce((s, e) => s + Number(e.amount || 0), 0);

  const habitCount: Record<string, number> = {};
  for (const h of d.habitLogs) habitCount[h.habit.toLowerCase()] = (habitCount[h.habit.toLowerCase()] || 0) + 1;
  const habitTotal = d.habitLogs.length;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <h1 className="page-title">Overview</h1>
        <span className="faint" style={{ fontSize: 14 }}>{d.today}</span>
      </div>

      {/* Founder-clarity stat row: the numbers that matter, up front */}
      <div className="stats" style={{ marginBottom: 22 }}>
        <div className="stat"><div className="num">{open.length}</div><div className="lbl">open tasks</div></div>
        <div className="stat"><div className="num" style={{ color: dueToday ? "var(--warn)" : undefined }}>{dueToday}</div><div className="lbl">due today</div></div>
        <div className="stat"><div className="num">₹{spendTotal}</div><div className="lbl">spent this month</div></div>
        <div className="stat"><div className="num good">{habitTotal}</div><div className="lbl">habits / 7d</div></div>
      </div>

      <section className="card">
        <h2>Tasks · {open.length} open</h2>
        {open.length ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {open.map((t) => <TaskItem key={t.id} id={t.id} title={t.title} due_date={t.due_date} done={false} />)}
          </ul>
        ) : <p className="muted">Nothing open. 🎉</p>}
        {done.length > 0 && (
          <details style={{ marginTop: 12 }}>
            <summary className="muted" style={{ cursor: "pointer" }}>Recently done ({done.length})</summary>
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
              {done.map((t) => <TaskItem key={t.id} id={t.id} title={t.title} due_date={t.due_date} done={true} />)}
            </ul>
          </details>
        )}
      </section>

      <section className="card">
        <h2>Expenses · ₹{spendTotal} this month</h2>
        <p className="muted" style={{ margin: "0 0 12px" }}>Today: ₹{todaySpend}</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 14 }}>
          {d.expenses.slice(0, 8).map((e, i) => (
            <li key={i} className="divider" style={{ display: "flex", justifyContent: "space-between", padding: "7px 0" }}>
              <span>{e.item || "—"} <span className="faint">· {e.spent_on}</span></span>
              <span>₹{e.amount}</span>
            </li>
          ))}
          {!d.expenses.length && <p className="muted">No expenses this month.</p>}
        </ul>
      </section>

      <section className="card">
        <h2>Habits · last 7 days</h2>
        <div className="stats">
          {TRACKED_HABITS.map((h) => (
            <div key={h} className="stat">
              <div className={"num" + (habitCount[h] ? " good" : "")}>{habitCount[h] || 0}×</div>
              <div className="lbl">{h}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Recent notes</h2>
        {d.notes.length ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {d.notes.slice(0, 6).map((n, i) => (
              <li key={i} className="divider" style={{ padding: "7px 0", fontSize: 14 }}>{n.content}</li>
            ))}
          </ul>
        ) : <p className="muted">No notes yet.</p>}
      </section>
    </>
  );
}
