import {
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/profiles", label: "Sales Profiles", icon: Building2 },
  { href: "/settings", label: "Company Settings", icon: Settings },
];

export function DealershipShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card px-4 py-5 md:block">
        <div className="mb-8 px-2">
          <p className="text-sm font-medium text-muted-foreground">GND</p>
          <h1 className="text-xl font-semibold">Dealership</h1>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                href={item.href}
                key={item.href}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="md:pl-64">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 md:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
