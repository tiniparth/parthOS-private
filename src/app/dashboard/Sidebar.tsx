"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, CheckSquare, CalendarDays, Mail, Wallet, Activity, StickyNote, Brain, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/dashboard/search", label: "Search", icon: Search },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/dashboard/mail", label: "Mail", icon: Mail },
  { href: "/dashboard/expenses", label: "Expenses", icon: Wallet },
  { href: "/dashboard/habits", label: "Habits", icon: Activity },
  { href: "/dashboard/notes", label: "Notes", icon: StickyNote },
  { href: "/dashboard/memory", label: "Memory", icon: Brain },
];

export default function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));

  const NavLinks = ({ big = false }: { big?: boolean }) => (
    <>
      {items.map((i) => {
        const Icon = i.icon;
        return (
          <Link
            key={i.href}
            href={i.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg transition-colors",
              big ? "px-4 py-3 text-base" : "px-3 py-2 text-sm",
              isActive(i.href) ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className={big ? "h-5 w-5" : "h-4 w-4"} />
            {i.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col border-r border-border bg-card/40 px-3 py-5">
        <Link href="/dashboard" className="px-3 mb-7 text-lg font-bold tracking-tight">Parth OS<span className="text-primary">.</span></Link>
        <nav className="flex-1 space-y-1"><NavLinks /></nav>
        <a href="/api/logout" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4" /> Logout</a>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">Parth OS<span className="text-primary">.</span></Link>
        <button onClick={() => setOpen(true)} aria-label="Menu" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Menu className="h-6 w-6" /></button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <nav className="absolute right-0 top-0 h-full w-72 max-w-[80%] border-l border-border bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-bold tracking-tight">Parth OS<span className="text-primary">.</span></span>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="h-6 w-6" /></button>
            </div>
            <div className="space-y-1"><NavLinks big /></div>
            <a href="/api/logout" className="mt-4 flex items-center gap-3 rounded-lg px-4 py-3 text-base text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="h-5 w-5" /> Logout</a>
          </nav>
        </div>
      )}
    </>
  );
}
