"use client";

import { AppLogo } from "@/components/brand/app-logo";
import { isNativeShell } from "@/lib/platform/native";

export function AuthLayoutBrand() {
  return (
    <AppLogo
      href={isNativeShell() ? "/login" : "/"}
      variant="full"
      brandMode="dual"
      className="mx-auto w-full"
    />
  );
}
