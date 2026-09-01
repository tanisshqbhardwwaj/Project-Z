import { Suspense } from "react";
import RegisterForm from "./register-form";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
