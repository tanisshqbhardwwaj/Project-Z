"use client";

import { useRequireAuth } from "@/hooks/use-require-auth";
import { AppHeader, AppSidebar, MobileNav } from "@/components/layout/app-shell";
import { PageLoader } from "@/components/ui/page-loader";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, activeOrganizationName, loading } = useRequireAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <PageLoader label="Loading workspace..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <AppHeader
          userName={user?.name ?? user?.email ?? ""}
          orgName={activeOrganizationName ?? undefined}
        />
        <main className="flex flex-1 flex-col p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
