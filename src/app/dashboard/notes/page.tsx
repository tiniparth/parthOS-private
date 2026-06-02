import CrudTable from "../CrudTable";

export const dynamic = "force-dynamic";

export default function NotesPage() {
  return (
    <>
      <h1 className="page-title" style={{ marginBottom: 18 }}>Notes</h1>
      <CrudTable
        table="notes"
        columns={[
          { key: "content", label: "Note", type: "textarea", placeholder: "Anything to keep…" },
          { key: "tags", label: "Tags", type: "tags", placeholder: "comma, separated" },
        ]}
      />
    </>
  );
}
