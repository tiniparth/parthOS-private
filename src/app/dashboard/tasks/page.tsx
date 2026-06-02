import TasksView from "../TasksView";

export const dynamic = "force-dynamic";

export default function TasksPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight mb-5">Tasks</h1>
      <TasksView />
    </>
  );
}
