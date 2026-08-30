"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { OpsShell } from "@/components/ops/ops-shell";

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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

  return <OpsShell>{children}</OpsShell>;
}
