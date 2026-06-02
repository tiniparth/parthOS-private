import CrudTable from "../CrudTable";
import ProfileEditor from "../ProfileEditor";

export const dynamic = "force-dynamic";

export default function MemoryPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight mb-5">Memory</h1>

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Learned facts</p>
      <CrudTable
        table="memory_facts"
        columns={[
          { key: "fact", label: "Fact", type: "textarea", placeholder: "Something to remember…" },
          { key: "category", label: "Category", type: "select", options: ["work", "people", "preference", "personal", "other"] },
        ]}
      />

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-8 mb-3">Profile — “Who is Parth”</p>
      <ProfileEditor />
    </>
  );
}
