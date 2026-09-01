"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isNativeShell } from "@/lib/platform/native";
import { PageLoader } from "@/components/ui/page-loader";

/** Native Android/Windows apps never show the public marketing site. */
export function NativeMarketingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hideMarketing, setHideMarketing] = useState(false);

  useEffect(() => {
    if (!isNativeShell()) return;
    setHideMarketing(true);
    router.replace("/login");
  }, [router]);

  if (hideMarketing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <PageLoader label="Opening sign in..." />
      </div>
    );
  }

  return <>{children}</>;
}
