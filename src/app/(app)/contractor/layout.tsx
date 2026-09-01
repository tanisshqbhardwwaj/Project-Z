"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";

export default function ContractorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const businessType = useAuthStore((s) => s.activeBusinessType);
  const allowed = businessType === "CONTRACTOR";

  useEffect(() => {
    if (businessType != null && !allowed) {
      router.replace("/dashboard");
    }
  }, [allowed, businessType, router]);

  if (businessType == null) {
    return <PageLoader label="Loading..." />;
  }

  if (!allowed) {
    return <PageLoader label="Redirecting..." />;
  }

  return children;
}
