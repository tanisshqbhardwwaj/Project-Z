"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLogo, APP_SHELL_HEADER_HEIGHT } from "@/components/brand/app-logo";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { getMobileQuickAction } from "@/lib/navigation/mobile-quick-action";
import { useBusinessType } from "@/hooks/use-business-type";
import type { OrgRole } from "@prisma/client";
import { useAuthStore } from "@/stores/auth-store";
import { canAccessProjectsNav } from "@/lib/permissions/rbac";
import { useModuleNav } from "@/hooks/use-module-nav";

const SIDEBAR_WIDTH = "w-64";

function isNavActive(pathname: string, href: string) {
  if (href === "/projects") {
    return pathname.startsWith("/projects") || pathname.startsWith("/work-orders");
  }
  return pathname.startsWith(href);
}

const navLinkClass = (active: boolean) =>
  cn(
    "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  );

export function AppSidebar() {
  const pathname = usePathname();
  const profileActive = pathname.startsWith("/settings/profile");
  const biz = useBusinessType();
  const role = useAuthStore((s) => s.role) as OrgRole | null;
  const showProjects = role ? canAccessProjectsNav(role) : true;
  const moduleNav = useModuleNav();
  const navItems = [
    ...(showProjects
      ? [
          { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
          { href: "/projects", icon: FolderKanban, label: biz.workItemPlural },
        ]
      : []),
    ...moduleNav.map((m) => ({ href: m.href, icon: m.icon, label: m.label })),
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card md:flex",
        SIDEBAR_WIDTH
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b px-4",
          APP_SHELL_HEADER_HEIGHT
        )}
      >
        <AppLogo variant="compact" />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={navLinkClass(active)}>
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 border-t p-3">
        <Link href="/settings/profile" className={navLinkClass(profileActive)}>
          <User className="h-5 w-5 shrink-0" />
          Profile
        </Link>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const biz = useBusinessType();
  const role = useAuthStore((s) => s.role) as OrgRole | null;
  const showProjects = role ? canAccessProjectsNav(role) : true;
  const moduleNav = useModuleNav();
  const quickAction = getMobileQuickAction(pathname, biz);
  const QuickIcon = quickAction.Icon;

  const moduleItems = moduleNav.slice(0, showProjects ? 1 : 2).map((m) => ({
    href: m.href,
    icon: m.icon,
    label: m.label,
    isAction: false as const,
  }));

  const mobileItems = [
    ...(showProjects
      ? [
          { href: "/dashboard", icon: LayoutDashboard, label: "Home", isAction: false as const },
          { href: "/projects", icon: FolderKanban, label: biz.workItemPlural, isAction: false as const },
        ]
      : []),
    ...moduleItems,
    ...(showProjects
      ? [{ href: quickAction.href, icon: QuickIcon, label: quickAction.label, isAction: true as const }]
      : []),
    { href: "/settings/profile", icon: User, label: "Profile", isAction: false as const },
  ];

  const cols = mobileItems.length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md md:hidden">
      <div
        className="mx-auto grid h-[3.75rem] max-w-lg px-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = item.isAction
            ? pathname.startsWith("/expenses/new") || pathname.startsWith("/work-orders/new")
            : item.href === "/projects"
              ? pathname.startsWith("/projects") || pathname.startsWith("/work-orders")
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              aria-label={item.isAction ? quickAction.ariaLabel : item.label}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium sm:text-[11px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.isAction ? (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                  <Icon className="h-5 w-5" />
                </span>
              ) : (
                <Icon className="h-6 w-6" />
              )}
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-card/95" />
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

export const APP_SIDEBAR_WIDTH_CLASS = "md:pl-64";
