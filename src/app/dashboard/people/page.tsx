import CrudTable from "../CrudTable";

export const dynamic = "force-dynamic";

export default function PeoplePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">People</h1>
      <p className="text-sm text-muted-foreground mb-5">Your contacts — emails, roles, last touch.</p>
      <CrudTable
        table="people"
        columns={[
          { key: "name", label: "Name", type: "text", placeholder: "Name" },
          { key: "email", label: "Email", type: "text", placeholder: "email@…" },
          { key: "role", label: "Role", type: "text", placeholder: "MD, founder…" },
          { key: "company", label: "Company", type: "text" },
          { key: "last_contact", label: "Last contact", type: "date" },
        ]}
      />
    </>
  );
}
