"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isServiceVerticalEnabled } from "@/lib/org/service-vertical";
import { PageLoader } from "@/components/ui/page-loader";

export default function ServiceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const enabled = isServiceVerticalEnabled();

  useEffect(() => {
    if (!enabled) router.replace("/dashboard");
  }, [enabled, router]);

  if (!enabled) {
    return <PageLoader label="Redirecting..." />;
  }

  return children;
}
