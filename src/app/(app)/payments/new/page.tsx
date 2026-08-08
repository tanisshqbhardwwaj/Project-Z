"use client";

import { Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import NewPaymentPage from "./payment-redirect";

export default function PaymentsNewPage() {
  return (
    <Suspense fallback={<PageLoader label="Redirecting..." />}>
      <NewPaymentPage />
    </Suspense>
  );
}
