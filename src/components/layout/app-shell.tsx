"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLogo, APP_SHELL_HEADER_HEIGHT } from "@/components/brand/app-logo";
import { COMPANY_LINE, COMPANY_NAME } from "@/lib/brand/constants";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { BranchSwitcher } from "@/components/layout/branch-switcher";
import { SearchShortcutKeys } from "@/components/layout/search-shortcut-keys";
import { getMobileQuickAction } from "@/lib/navigation/mobile-quick-action";
import { useBusinessType } from "@/hooks/use-business-type";
import { useNavGroups, type NavItem } from "@/hooks/use-nav-items";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { AppearanceMenu } from "@/components/theme/appearance-menu";
import { SyncBadge } from "@/components/sync/sync-badge";
import { CashierModeBanner } from "@/components/layout/cashier-mode-banner";
import { useCashierMode } from "@/hooks/use-cashier-mode";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const SIDEBAR_WIDTH = "w-64";

function isNavActive(pathname: string, href: string) {
  if (href === "/projects") {
    return pathname.startsWith("/projects") || pathname.startsWith("/work-orders");
  }
  if (href === "/settings/profile") {
    return pathname.startsWith("/settings") && !pathname.startsWith("/settings/billing");
  }
  if (href === "/settings/billing") {
    return pathname.startsWith("/settings/billing");
  }
  if (href.startsWith("/settings/")) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === "/dashboard" || href === "/cashier") {
    return pathname === href || (href === "/dashboard" && pathname === "/");
  }
  return pathname.startsWith(href);
}

const navLinkClass = (active: boolean) =>
  cn(
    "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
    active
      ? "bg-vertical text-vertical-foreground shadow-e1"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  );

function SidebarSection({
  label,
  items,
  pathname,
  unreadNotifications = 0,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  unreadNotifications?: number;
}) {
  if (items.length === 0) return null;
  return (
    <div className="pt-5 first:pt-0">
      <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);
          const showBadge = item.key === "notifications" && unreadNotifications > 0;
          return (
            <Link key={item.key} href={item.href} className={navLinkClass(active)}>
              <span className="relative shrink-0">
                <Icon className="h-5 w-5" />
                {showBadge ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                ) : null}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const groups = useNavGroups();
  const { active: cashierMode } = useCashierMode();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card md:flex",
        SIDEBAR_WIDTH
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center border-b px-4",
          APP_SHELL_HEADER_HEIGHT
        )}
      >
        <AppLogo href="/dashboard" variant="compact" brandMode="product" showCompanyTagline />
      </div>
      <nav className="flex-1 overflow-y-auto p-3 pb-4">
        {cashierMode ? (
          <SidebarSection
            label="Cashier"
            items={groups.modules}
            pathname={pathname}
          />
        ) : (
          <>
            <SidebarSection label="Core" items={groups.core} pathname={pathname} />
            <SidebarSection label="Modules" items={groups.modules} pathname={pathname} />
            <SidebarSection
              label="Tools"
              items={groups.tools}
              pathname={pathname}
              unreadNotifications={unreadCount}
            />
          </>
        )}
      </nav>
      <div className="shrink-0 border-t px-4 py-3">
        <p className="text-center text-[10px] font-medium leading-snug text-muted-foreground">
          {COMPANY_LINE}
        </p>
      </div>
    </aside>
  );
}

function mobileNavLabel(key: string, label: string) {
  const short: Record<string, string> = {
    dashboard: "Home",
    cashier_home: "Home",
    cashier_bill: "Bill",
    cashier_scan: "Scan",
    cashier_returns: "Return",
    cashier_my_bills: "Bills",
    cashier_attendance: "Me",
    cashier_profile: "Profile",
    shop_sales: "Bills",
    shop_offers: "Offers",
    shop_inventory: "Stock",
    shop_purchases: "Buy",
    shop_expenses: "Costs",
    shop_udhaar: "Credit",
    shop_activity: "Trail",
    staff: "Staff",
    staff_me: "Me",
  };
  return short[key] ?? label;
}

export function MobileNav() {
  const pathname = usePathname();
  const biz = useBusinessType();
  const groups = useNavGroups();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const quickAction = getMobileQuickAction(pathname, biz);
  const QuickIcon = quickAction.Icon;
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryItems = [...groups.core, ...groups.modules];
  const maxNavSlots = groups.showProjects ? 4 : 5;
  const needsMore = primaryItems.length > maxNavSlots;
  const visibleItems = needsMore
    ? primaryItems.slice(0, maxNavSlots - 1)
    : primaryItems;
  const overflowItems = needsMore ? primaryItems.slice(maxNavSlots - 1) : [];
  const overflowActive = overflowItems.some((i) => isNavActive(pathname, i.href));
  const cols =
    visibleItems.length + (groups.showProjects ? 1 : 0) + (needsMore ? 1 : 0);

  const quickActive =
    pathname.startsWith("/expenses/new") || pathname.startsWith("/work-orders/new");

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md md:hidden">
        <div
          className="mx-auto grid h-[3.75rem] w-full max-w-none px-1"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(pathname, item.href);
            const label =
              item.key === "dashboard"
                ? "Home"
                : mobileNavLabel(item.key, item.label);
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-label={label}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium sm:text-[11px]",
                  active ? "text-vertical" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
                <span className="max-w-full truncate leading-none">{label}</span>
              </Link>
            );
          })}
          {groups.showProjects && (
            <Link
              href={quickAction.href}
              aria-label={quickAction.ariaLabel}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium sm:text-[11px]",
                quickActive ? "text-vertical" : "text-muted-foreground"
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-e2">
                <QuickIcon className="h-5 w-5" />
              </span>
              <span className="leading-none">{quickAction.label}</span>
            </Link>
          )}
          {needsMore && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More"
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium sm:text-[11px]",
                overflowActive ? "text-vertical" : "text-muted-foreground"
              )}
            >
              <Ellipsis className="h-6 w-6" />
              <span className="leading-none">More</span>
            </button>
          )}
        </div>
        <div className="h-[env(safe-area-inset-bottom)] bg-card/95" />
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent>
          <SheetTitle className="sr-only">More</SheetTitle>
          {overflowItems.length > 0 && (
            <div className="pb-2">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Modules
              </p>
              {overflowItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium",
                      active
                        ? "bg-vertical-subtle text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
          <div className="border-t pt-2">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tools
            </p>
            {groups.tools.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium",
                    active
                      ? "bg-vertical-subtle text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <span className="relative shrink-0">
                    <Icon className="h-5 w-5" />
                    {item.key === "notifications" && unreadCount > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function AppHeader({ orgName }: { userName?: string; orgName?: string }) {
  const setPaletteOpen = useCommandPaletteStore((s) => s.setOpen);
  const { active: cashierMode } = useCashierMode();

  return (
    <>
      <CashierModeBanner />
      <header
      className={cn(
        "sticky top-0 z-40 flex shrink-0 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur-md md:gap-3 md:px-6",
        APP_SHELL_HEADER_HEIGHT
      )}
    >
      <AppLogo
        href="/dashboard"
        variant="compact"
        brandMode="product"
        className="shrink-0 md:hidden"
        showCompanyTagline={false}
      />
      <div className="flex min-w-0 items-center gap-2 overflow-hidden">
        <OrgSwitcher currentOrgName={orgName} />
        <BranchSwitcher />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-label="Open search"
        className={cn(
          "hidden h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground md:flex lg:w-64",
          cashierMode ? "w-44 lg:w-48" : "w-56"
        )}
      >
        <Search className="h-4 w-4 shrink-0 opacity-70" />
        <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">
          Search…
        </span>
        <SearchShortcutKeys className="pointer-events-none shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground" />
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 md:hidden"
        aria-label="Search"
        onClick={() => setPaletteOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>
      <SyncBadge />
      <AppearanceMenu />
      </div>
    </header>
    </>
  );
}

export const APP_SIDEBAR_WIDTH_CLASS = "md:pl-64";
