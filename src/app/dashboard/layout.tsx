import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthed } from "@/lib/auth";
import Nav from "./Nav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthed())) redirect("/login");
  return (
    <div className="container">
      <header className="topbar">
        <Link href="/dashboard" className="brand">
          Parth OS<span className="dot">.</span>
        </Link>
        <Nav />
        <a href="/api/logout" className="logout">Logout</a>
      </header>
      {children}
    </div>
  );
}
