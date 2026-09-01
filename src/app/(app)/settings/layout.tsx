"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Cloud,
  CreditCard,
  GitBranch,
  User,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { isShopVertical } from "@/lib/org/business-type";
import { useActiveSubscriptionStatus } from "@/hooks/use-active-subscription-status";
import { billingNudgeBadge, shouldShowBillingInSidebar } from "@/lib/billing/show-billing-nudge";

const navLinkClass = (active: boolean) =>
  cn(
    "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
    active
      ? "bg-vertical text-vertical-foreground shadow-e1"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  );

function SettingsNav() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const businessType = useAuthStore((s) => s.activeBusinessType);
  const subscriptionStatus = useActiveSubscriptionStatus();
  const isOwner = role === "OWNER";
  const showShopBranches = isOwner && isShopVertical(businessType ?? "CONTRACTOR");
  const billingBadge = billingNudgeBadge(subscriptionStatus);
  const showBillingNudge = shouldShowBillingInSidebar({
    role: role as import("@prisma/client").OrgRole | null,
    businessType: businessType ?? null,
    subscriptionStatus,
  });

  const items = [
    { href: "/settings/profile", label: "Profile", icon: User, show: true },
    { href: "/settings/organization", label: "Organization", icon: Building2, show: isOwner },
    { href: "/settings/members", label: "Members", icon: UsersRound, show: isOwner },
    { href: "/settings/branches", label: "Branches", icon: GitBranch, show: showShopBranches },
    { href: "/settings/storage", label: "Storage & Sync", icon: Cloud, show: isOwner },
    {
      href: "/settings/billing",
      label: "Billing",
      icon: CreditCard,
      show: isOwner,
      badge: showBillingNudge ? billingBadge ?? "Action needed" : undefined,
    },
  ];

  return (
    <nav className="space-y-1">
      {items
        .filter((item) => item.show)
        .map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={navLinkClass(active)}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {"badge" in item && item.badge ? (
                <span className="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
    </nav>
  );
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Profile, organization, team, and billing preferences
        </p>
      </div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <SettingsNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
