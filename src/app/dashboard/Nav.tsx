"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/tasks", label: "Tasks" },
  { href: "/dashboard/expenses", label: "Expenses" },
  { href: "/dashboard/habits", label: "Habits" },
  { href: "/dashboard/mail", label: "Mail" },
  { href: "/dashboard/journal", label: "Journal" },
  { href: "/dashboard/memory", label: "Memory" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      {NAV.map((n) => {
        const active = n.href === "/dashboard" ? path === n.href : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} className={active ? "active" : ""}>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
