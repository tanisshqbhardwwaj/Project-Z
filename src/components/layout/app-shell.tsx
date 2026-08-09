"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppLogo, APP_SHELL_HEADER_HEIGHT } from "@/components/brand/app-logo";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { getMobileQuickAction } from "@/lib/navigation/mobile-quick-action";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/settings/profile", icon: User, label: "Profile" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div
        className={cn(
          "flex shrink-0 items-center border-b px-4",
          APP_SHELL_HEADER_HEIGHT
        )}
      >
        <AppLogo variant="compact" />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/projects"
              ? pathname.startsWith("/projects") || pathname.startsWith("/work-orders")
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 border-t p-3">
        <Link href="/work-orders/new">
          <Button className="h-11 w-full rounded-xl" size="default">
            <Plus className="mr-2 h-4 w-4" />
            New Work Order
          </Button>
        </Link>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const quickAction = getMobileQuickAction(pathname);
  const QuickIcon = quickAction.Icon;

  const mobileItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { href: "/projects", icon: FolderKanban, label: "Projects" },
    { href: quickAction.href, icon: QuickIcon, label: quickAction.label, isAction: true },
    { href: "/settings/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg px-1">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/projects"
              ? pathname.startsWith("/projects") && !item.isAction
              : item.isAction
                ? pathname.startsWith("/expenses/new") ||
                  pathname.startsWith("/work-orders/new")
                : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              aria-label={item.isAction ? quickAction.ariaLabel : item.label}
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-end gap-0.5 pb-2 pt-1 text-[10px] font-medium sm:text-[11px]",
                item.isAction && "relative -top-3",
                active && !item.isAction ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.isAction ? (
                <span className="flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
                  <Icon className="h-7 w-7" />
                </span>
              ) : (
                <>
                  <Icon className="h-6 w-6" />
                  <span>{item.label}</span>
                </>
              )}
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

export function AppHeader({ orgName }: { userName?: string; orgName?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex shrink-0 items-center justify-between gap-4 border-b bg-card/95 px-4 backdrop-blur-md md:px-6",
        APP_SHELL_HEADER_HEIGHT
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <AppLogo href="/dashboard" variant="mark" className="md:hidden shrink-0" />
        <div className="min-w-0 flex-1">
          <OrgSwitcher currentOrgName={orgName} />
        </div>
      </div>
    </header>
  );
}
