import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import Sidebar from "./Sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthed())) redirect("/login");
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:pl-56">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-9">{children}</div>
      </main>
    </div>
  );
}
