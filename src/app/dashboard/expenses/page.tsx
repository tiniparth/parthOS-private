import ExpensesView from "../ExpensesView";

export const dynamic = "force-dynamic";

export default function ExpensesPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight mb-5">Expenses</h1>
      <ExpensesView />
    </>
  );
}
