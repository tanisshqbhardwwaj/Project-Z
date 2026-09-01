"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { isShopVertical } from "@/lib/org/business-type";
import { PageLoader } from "@/components/ui/page-loader";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const businessType = useAuthStore((s) => s.activeBusinessType);
  const allowed = businessType != null && isShopVertical(businessType);

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
