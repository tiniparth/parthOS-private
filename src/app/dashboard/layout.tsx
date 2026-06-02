import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/tasks", label: "Tasks" },
  { href: "/dashboard/expenses", label: "Expenses" },
  { href: "/dashboard/habits", label: "Habits" },
  { href: "/dashboard/notes", label: "Notes" },
  { href: "/dashboard/memory", label: "Memory" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthed())) redirect("/login");
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 18px 64px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <Link href="/dashboard" style={{ fontSize: 22, fontWeight: 700, textDecoration: "none", color: "#e8e8ea" }}>
          🧠 Parth OS
        </Link>
        <nav style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              style={{ padding: "6px 12px", borderRadius: 8, textDecoration: "none", color: "#cfcfd4", background: "#1b1b1e", fontSize: 14 }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <a href="/api/logout" style={{ color: "#888", fontSize: 13, textDecoration: "none" }}>Logout</a>
      </header>
      {children}
    </div>
  );
}
