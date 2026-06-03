import ClientsView from "../ClientsView";

export const dynamic = "force-dynamic";

export default function ClientsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Clients</h1>
      <p className="text-sm text-muted-foreground mb-5">Your pipeline — stage, next action, blocker, last contact.</p>
      <ClientsView />
    </>
  );
}
