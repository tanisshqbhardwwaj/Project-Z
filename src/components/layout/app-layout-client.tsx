"use client";

import { useEffect } from "react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { AppHeader, AppSidebar, MobileNav, APP_SIDEBAR_WIDTH_CLASS } from "@/components/layout/app-shell";
import { CommandPalette } from "@/components/layout/command-palette";
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
    <div className="min-h-screen overflow-x-hidden bg-background">
      <AppSidebar />
      <div className={APP_SIDEBAR_WIDTH_CLASS}>
        <div className="flex min-h-screen min-w-0 flex-col">
          <AppHeader orgName={activeOrganizationName ?? undefined} />
          <main className="min-w-0 flex-1 p-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
      <CommandPalette />
    </div>
  );
}
