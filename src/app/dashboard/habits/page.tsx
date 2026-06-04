import CrudTable from "../CrudTable";
import HabitTracker from "../HabitTracker";
import TrainingToday from "../TrainingToday";

export const dynamic = "force-dynamic";

export default function HabitsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Habits</h1>
      <p className="text-sm text-muted-foreground mb-5">Tap the circle to log today. Dots show your last 7 days.</p>

      <div className="mb-5">
        <TrainingToday />
      </div>

      <HabitTracker />

      <details className="mt-8">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          All logs (edit / backfill)
        </summary>
        <div className="mt-3">
          <CrudTable
            table="habit_logs"
            columns={[
              { key: "habit", label: "Habit", type: "select", options: ["running", "reading", "yoga", "journalling"] },
              { key: "done_on", label: "Done on", type: "date" },
              { key: "note", label: "Note", type: "text", placeholder: "optional" },
            ]}
          />
        </div>
      </details>
    </>
  );
}
