"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckSquare, CalendarDays, Mail, Wallet, Activity, StickyNote, Brain, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
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
  const isActive = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col border-r border-border bg-card/40 px-3 py-5">
        <Link href="/dashboard" className="px-3 mb-7 text-lg font-bold tracking-tight">
          Parth OS<span className="text-primary">.</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {items.map((i) => {
            const Icon = i.icon;
            return (
              <Link
                key={i.href}
                href={i.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive(i.href)
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Icon className="h-4 w-4" />
                {i.label}
              </Link>
            );
          })}
        </nav>
        <a href="/api/logout" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" /> Logout
        </a>
      </aside>

      {/* Mobile top nav */}
      <header className="md:hidden sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <Link href="/dashboard" className="font-bold tracking-tight shrink-0">
          Parth OS<span className="text-primary">.</span>
        </Link>
        <nav className="flex-1 flex gap-1 overflow-x-auto">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs whitespace-nowrap transition-colors",
                isActive(i.href) ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <a href="/api/logout" className="text-xs text-muted-foreground shrink-0">Exit</a>
      </header>
    </>
  );
}
