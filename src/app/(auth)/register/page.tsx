import { Suspense } from "react";
import RegisterForm from "./register-form";

export default function RegisterPage() {
  const googleLoginEnabled =
    process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === "true" &&
    Boolean(
      process.env.AUTH_GOOGLE_ID?.trim() ||
        process.env.GOOGLE_CLIENT_ID?.trim()
    ) &&
    Boolean(
      process.env.AUTH_GOOGLE_SECRET?.trim() ||
        process.env.GOOGLE_CLIENT_SECRET?.trim()
    );

  return (
    <Suspense fallback={<div className="py-8 text-center">Loading...</div>}>
      <RegisterForm googleLoginEnabled={googleLoginEnabled} />
    </Suspense>
  );
}
