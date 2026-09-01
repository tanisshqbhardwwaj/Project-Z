"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCashierMode } from "@/hooks/use-cashier-mode";
import { isCashierRouteAllowed } from "@/lib/staff/cashier-mode";
import { PageLoader } from "@/components/ui/page-loader";

export function CashierRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { active, access, homePath } = useCashierMode();

  useEffect(() => {
    if (!active) return;
    if (pathname === "/dashboard") {
      router.replace(homePath);
      return;
    }
    if (!isCashierRouteAllowed(pathname, access)) {
      router.replace(homePath);
    }
  }, [active, access, homePath, pathname, router]);

  if (!active) return <>{children}</>;

  if (pathname === "/dashboard" || !isCashierRouteAllowed(pathname, access)) {
    return <PageLoader label="Opening cashier…" />;
  }

  return <>{children}</>;
}
