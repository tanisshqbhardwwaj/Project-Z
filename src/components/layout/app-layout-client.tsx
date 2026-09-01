"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/hooks/use-require-auth";
import {
  AppHeader,
  AppSidebar,
  MobileNav,
  APP_SIDEBAR_WIDTH_CLASS,
} from "@/components/layout/app-shell";
import { CashierRouteGuard } from "@/components/layout/cashier-route-guard";
import { SyncEngineProvider } from "@/components/sync/sync-badge";
import { OfflineBanner } from "@/components/sync/offline-banner";
import { CommandPalette } from "@/components/layout/command-palette";
import { AndroidBackButton } from "@/platform/android/android-back-button";
import { PageLoader } from "@/components/ui/page-loader";
import { useAuthStore } from "@/stores/auth-store";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const { activeOrganizationName, loading } = useRequireAuth();
  const activeBusinessType = useAuthStore((s) => s.activeBusinessType);

  useEffect(() => {
    const root = document.documentElement;
    if (activeBusinessType) {
      root.dataset.vertical = activeBusinessType;
    } else {
      delete root.dataset.vertical;
    }
    return () => {
      delete root.dataset.vertical;
    };
  }, [activeBusinessType]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <PageLoader label="Loading workspace..." />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <AppSidebar />
      <div className={cn(APP_SIDEBAR_WIDTH_CLASS, "flex min-w-0 flex-1 flex-col overflow-hidden")}>
        <AppHeader orgName={activeOrganizationName ?? undefined} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
          <SyncEngineProvider>
            <OfflineBanner />
            <CashierRouteGuard>{children}</CashierRouteGuard>
          </SyncEngineProvider>
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
      <AndroidBackButton />
    </div>
  );
}
