import { Suspense } from "react";
import VerifyEmailForm from "./verify-email-form";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center">Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
