import { Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import PaymentRedirect from "./payment-redirect";

export default function PaymentsNewPage() {
  return (
    <Suspense fallback={<PageLoader label="Redirecting..." />}>
      <PaymentRedirect />
    </Suspense>
  );
}
