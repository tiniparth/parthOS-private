import CrudTable from "../CrudTable";
import ProfileEditor from "../ProfileEditor";

export const dynamic = "force-dynamic";

export default function MemoryPage() {
  return (
    <>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Memory</h1>

      <h2 style={{ fontSize: 15, textTransform: "uppercase", letterSpacing: 1, opacity: 0.6, marginBottom: 12 }}>Learned facts</h2>
      <CrudTable
        table="memory_facts"
        columns={[
          { key: "fact", label: "Fact", type: "textarea", placeholder: "Something to remember…" },
          { key: "category", label: "Category", type: "select", options: ["work", "people", "preference", "personal", "other"] },
        ]}
      />

      <h2 style={{ fontSize: 15, textTransform: "uppercase", letterSpacing: 1, opacity: 0.6, margin: "28px 0 12px" }}>Profile — “Who is Parth”</h2>
      <ProfileEditor />
    </>
  );
}
