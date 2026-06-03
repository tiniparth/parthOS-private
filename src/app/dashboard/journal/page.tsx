import JournalView from "../JournalView";

export const dynamic = "force-dynamic";

export default function JournalPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Journal</h1>
      <p className="text-sm text-muted-foreground mb-5">Daily reflections — your private log.</p>
      <JournalView />
    </>
  );
}
