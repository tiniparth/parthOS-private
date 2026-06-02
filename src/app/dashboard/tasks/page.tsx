import CrudTable from "../CrudTable";

export const dynamic = "force-dynamic";

export default function TasksPage() {
  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 18 }}>Tasks</h1>
      <CrudTable
        table="tasks"
        columns={[
          { key: "title", label: "Title", type: "text", placeholder: "What needs doing…" },
          { key: "status", label: "Status", type: "select", options: ["open", "done"] },
          { key: "priority", label: "Priority", type: "select", options: ["low", "med", "high"] },
          { key: "due_date", label: "Due", type: "date" },
        ]}
      />
    </>
  );
}
