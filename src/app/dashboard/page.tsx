import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { loadDashboard } from "@/lib/dashboard";
import TaskItem from "./TaskItem";

export const dynamic = "force-dynamic";

const TRACKED_HABITS = ["running", "reading", "yoga", "journalling"];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: "#161618", border: "1px solid #262629", borderRadius: 14, padding: 20, marginBottom: 18 }}>
      <h2 style={{ fontSize: 15, textTransform: "uppercase", letterSpacing: 1, opacity: 0.6, margin: "0 0 14px" }}>{title}</h2>
      {children}
    </section>
  );
}

export default async function Dashboard() {
  if (!(await isAuthed())) redirect("/login");
  const d = await loadDashboard();

  const open = d.tasks.filter((t) => t.status !== "done");
  const done = d.tasks.filter((t) => t.status === "done").slice(0, 8);

  const spendTotal = d.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const todaySpend = d.expenses.filter((e) => e.spent_on === d.today).reduce((s, e) => s + Number(e.amount || 0), 0);
  const byCat: Record<string, number> = {};
  for (const e of d.expenses) byCat[e.category || "uncategorized"] = (byCat[e.category || "uncategorized"] || 0) + Number(e.amount || 0);

  const habitCount: Record<string, number> = {};
  for (const h of d.habitLogs) {
    const k = h.habit.toLowerCase();
    habitCount[k] = (habitCount[k] || 0) + 1;
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 64px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>🧠 Parth OS</h1>
        <span style={{ opacity: 0.5, fontSize: 14 }}>{d.today}</span>
      </header>

      <Card title={`Tasks · ${open.length} open`}>
        {open.length ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {open.map((t) => (
              <TaskItem key={t.id} id={t.id} title={t.title} due_date={t.due_date} done={false} />
            ))}
          </ul>
        ) : (
          <p style={{ opacity: 0.5 }}>Nothing open. 🎉</p>
        )}
        {done.length > 0 && (
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", opacity: 0.6 }}>Recently done ({done.length})</summary>
            <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
              {done.map((t) => (
                <TaskItem key={t.id} id={t.id} title={t.title} due_date={t.due_date} done={true} />
              ))}
            </ul>
          </details>
        )}
      </Card>

      <Card title={`Expenses · ₹${spendTotal} this month`}>
        <p style={{ margin: "0 0 12px", opacity: 0.8 }}>Today: ₹{todaySpend}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {Object.entries(byCat).map(([c, amt]) => (
            <span key={c} style={{ background: "#222", borderRadius: 8, padding: "4px 10px", fontSize: 13 }}>
              {c}: ₹{amt}
            </span>
          ))}
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 14 }}>
          {d.expenses.slice(0, 12).map((e, i) => (
            <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #222" }}>
              <span>{e.item || "—"} <span style={{ opacity: 0.4 }}>· {e.spent_on}</span></span>
              <span>₹{e.amount}</span>
            </li>
          ))}
          {!d.expenses.length && <p style={{ opacity: 0.5 }}>No expenses this month.</p>}
        </ul>
      </Card>

      <Card title="Habits · last 7 days">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {TRACKED_HABITS.map((h) => (
            <div key={h} style={{ background: "#222", borderRadius: 10, padding: "10px 14px", minWidth: 90 }}>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{habitCount[h] || 0}×</div>
              <div style={{ opacity: 0.6, fontSize: 13, textTransform: "capitalize" }}>{h}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title={`Recent notes · ${d.notes.length}`}>
        {d.notes.length ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {d.notes.map((n, i) => (
              <li key={i} style={{ padding: "6px 0", borderBottom: "1px solid #222", fontSize: 14 }}>
                {n.content}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ opacity: 0.5 }}>No notes yet.</p>
        )}
      </Card>

      <Card title={`What I know about you · ${d.facts.length} facts`}>
        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 14 }}>
          {d.facts.map((f, i) => (
            <li key={i} style={{ padding: "3px 0" }}>
              {f.category ? <strong style={{ opacity: 0.6 }}>[{f.category}] </strong> : null}
              {f.fact}
            </li>
          ))}
          {!d.facts.length && <p style={{ opacity: 0.5 }}>Nothing learned yet — it'll fill up as you chat.</p>}
        </ul>
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer", opacity: 0.6 }}>Full profile</summary>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, opacity: 0.8, marginTop: 10, fontFamily: "inherit" }}>{d.profile}</pre>
        </details>
      </Card>
    </main>
  );
}
