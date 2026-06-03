import GoalsView from "../GoalsView";

export const dynamic = "force-dynamic";

export default function GoalsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Goals</h1>
      <p className="text-sm text-muted-foreground mb-5">What you're driving toward — track progress.</p>
      <GoalsView />
    </>
  );
}
