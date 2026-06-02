import CrudTable from "../CrudTable";

export const dynamic = "force-dynamic";

export default function HabitsPage() {
  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 18 }}>Habits</h1>
      <CrudTable
        table="habit_logs"
        columns={[
          { key: "habit", label: "Habit", type: "select", options: ["running", "reading", "yoga", "journalling"] },
          { key: "done_on", label: "Done on", type: "date" },
          { key: "note", label: "Note", type: "text", placeholder: "optional" },
        ]}
      />
    </>
  );
}
