"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Cloud,
  CreditCard,
  User,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useActiveSubscriptionStatus } from "@/hooks/use-active-subscription-status";
import { billingNudgeBadge, shouldShowBillingInSidebar } from "@/lib/billing/show-billing-nudge";

const tabClass = (active: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
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
    <nav
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Settings sections"
    >
      {items
        .filter((item) => item.show)
        .map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={tabClass(active)}>
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              {"badge" in item && item.badge ? (
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
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
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-8">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Profile, organization, team, and billing preferences
          </p>
        </div>
        <SettingsNav />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
