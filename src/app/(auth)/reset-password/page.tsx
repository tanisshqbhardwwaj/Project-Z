import { Suspense } from "react";
import ResetPasswordForm from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
