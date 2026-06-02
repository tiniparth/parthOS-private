import CrudTable from "../CrudTable";
import ProfileEditor from "../ProfileEditor";

export const dynamic = "force-dynamic";

export default function MemoryPage() {
  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 18 }}>Memory</h1>

      <p className="eyebrow" style={{ marginBottom: 12 }}>Learned facts</p>
      <CrudTable
        table="memory_facts"
        columns={[
          { key: "fact", label: "Fact", type: "textarea", placeholder: "Something to remember…" },
          { key: "category", label: "Category", type: "select", options: ["work", "people", "preference", "personal", "other"] },
        ]}
      />

      <p className="eyebrow" style={{ margin: "30px 0 12px" }}>Profile — “Who is Parth”</p>
      <ProfileEditor />
    </>
  );
}
