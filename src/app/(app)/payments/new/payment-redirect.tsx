"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PageLoader } from "@/components/ui/page-loader";

export default function PaymentRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  useEffect(() => {
    router.replace(projectId ? `/expenses/new?projectId=${projectId}` : "/projects");
  }, [projectId, router]);

  return <PageLoader label="Redirecting..." />;
}
