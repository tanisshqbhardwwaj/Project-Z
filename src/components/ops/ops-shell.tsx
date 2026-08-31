"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Menu,
  Search,
  Shield,
  Tag,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export const OPS_NAV = [
  { href: "/ops", label: "Overview", icon: LayoutDashboard },
  { href: "/ops/customers", label: "Organizations", icon: Building2 },
  { href: "/ops/expiring", label: "Expiring", icon: Clock },
  { href: "/ops/users", label: "Users", icon: Users },
  { href: "/ops/requests", label: "Plan requests", icon: ClipboardList },
  { href: "/ops/plans", label: "Pricing catalog", icon: Tag },
] as const;

function isNavActive(pathname: string, href: string) {
  if (href === "/ops") return pathname === "/ops";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1 p-3">
      {OPS_NAV.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function OpsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q) {
      router.push("/ops/customers");
      return;
    }
    router.push(`/ops/customers?q=${encodeURIComponent(q)}`);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold leading-none">BusinessOS Ops</p>
            <p className="text-[11px] text-muted-foreground">Founder console</p>
          </div>
        </div>
        <NavLinks pathname={pathname} />
        <div className="mt-auto border-t p-3">
          <Link
            href="/dashboard"
            className="flex h-10 items-center rounded-xl px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            ← Back to app
          </Link>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col md:pl-64">
        <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex h-16 items-center gap-3 px-4 md:px-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <Badge variant="secondary" className="hidden rounded-full sm:inline-flex">
              Founder
            </Badge>

            <form onSubmit={submitSearch} className="relative ml-auto max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search orgs, owner email…"
                className="rounded-xl pl-9"
              />
            </form>

            <Link
              href="/dashboard"
              className="hidden text-sm text-muted-foreground underline sm:inline"
            >
              App
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="fixed inset-y-0 left-0 h-full w-72 max-h-none rounded-none border-r p-0">
          <SheetTitle className="sr-only">Ops navigation</SheetTitle>
          <div className="flex h-16 items-center gap-2 border-b px-4">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">BusinessOS Ops</span>
          </div>
          <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
