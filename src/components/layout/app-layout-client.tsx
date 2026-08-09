"use client";

import { useRequireAuth } from "@/hooks/use-require-auth";
import { AppHeader, AppSidebar, MobileNav, APP_SIDEBAR_WIDTH_CLASS } from "@/components/layout/app-shell";
import { PageLoader } from "@/components/ui/page-loader";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const { activeOrganizationName, loading } = useRequireAuth();

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
    </div>
  );
}
