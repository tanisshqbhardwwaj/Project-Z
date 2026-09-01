import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
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
      <LoginForm googleLoginEnabled={googleLoginEnabled} />
    </Suspense>
  );
}
