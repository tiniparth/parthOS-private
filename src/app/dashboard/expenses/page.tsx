import CrudTable from "../CrudTable";

export const dynamic = "force-dynamic";

export default function ExpensesPage() {
  return (
    <>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Expenses</h1>
      <CrudTable
        table="expenses"
        columns={[
          { key: "amount", label: "Amount", type: "number", placeholder: "₹" },
          { key: "item", label: "Item", type: "text", placeholder: "lunch…" },
          { key: "category", label: "Category", type: "select", options: ["food", "travel", "work", "personal", "other"] },
          { key: "spent_on", label: "Date", type: "date" },
        ]}
      />
    </>
  );
}
