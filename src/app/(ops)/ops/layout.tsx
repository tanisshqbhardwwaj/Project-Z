"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/ops", label: "Overview" },
  { href: "/ops/customers", label: "Customers" },
  { href: "/ops/requests", label: "Plan requests" },
  { href: "/ops/plans", label: "Pricing catalog" },
];

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, authenticated } = useRequireAuth();
  const isPlatformAdmin = useAuthStore((s) => s.isPlatformAdmin);
  const status = useAuthStore((s) => s.status);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    if (status === "unauthenticated") {
      setAllowed(false);
      return;
    }

    if (isPlatformAdmin) {
      setAllowed(true);
      return;
    }

    apiFetch<{ isPlatformAdmin?: boolean }>("/api/v1/auth/me")
      .then((data) => {
        const admin = Boolean(data.isPlatformAdmin);
        setAllowed(admin);
        if (!admin) router.replace("/dashboard");
      })
      .catch(() => {
        setAllowed(false);
      });
  }, [loading, authenticated, isPlatformAdmin, status, router]);

  if (loading || allowed === null) {
    return <PageLoader label="Loading operator console…" />;
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-semibold">Ops access denied</p>
        <p className="max-w-md text-sm text-muted-foreground">
          This console is only for platform admins. Sign in with an email listed in{" "}
          <code>PLATFORM_ADMIN_EMAILS</code>, then open Ops from Profile or the sidebar.
        </p>
        <Link href="/dashboard" className="text-sm underline">
          Back to app
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Operator
            </p>
            <h1 className="text-lg font-semibold">Project Z Ops</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm",
                  pathname === item.href ||
                    (item.href !== "/ops" && pathname.startsWith(`${item.href}/`))
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/dashboard" className="text-sm text-muted-foreground underline">
            Back to app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
    </div>
  );
}
