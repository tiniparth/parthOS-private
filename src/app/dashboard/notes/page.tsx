import CrudTable from "../CrudTable";

export const dynamic = "force-dynamic";

export default function NotesPage() {
  return (
    <>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Notes</h1>
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
