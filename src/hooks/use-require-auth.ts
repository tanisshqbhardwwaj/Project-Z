"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/invite",
];

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, initialized, bootstrap, user, activeOrganizationId, activeOrganizationName, role } =
    useAuthStore();

  useEffect(() => {
    if (!initialized) {
      bootstrap();
    }
  }, [initialized, bootstrap]);

  useEffect(() => {
    if (!initialized) return;

    if (status === "unauthenticated") {
      const isPublic = PUBLIC_PATHS.some((p) => {
        if (p === "/") return pathname === "/";
        return pathname === p || pathname.startsWith(`${p}/`);
      });
      if (!isPublic) {
        router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    const isOps = pathname.startsWith("/ops");
    if (
      status === "authenticated" &&
      !activeOrganizationId &&
      !pathname.startsWith("/onboarding") &&
      !isOps
    ) {
      router.replace("/onboarding");
    }
  }, [status, initialized, activeOrganizationId, pathname, router]);

  return {
    user,
    activeOrganizationId,
    activeOrganizationName,
    role,
    loading: !initialized || status === "loading",
    authenticated: status === "authenticated",
  };
}

export function useAuthInit() {
  const { initialized, bootstrap } = useAuthStore();

  useEffect(() => {
    if (!initialized) bootstrap();
  }, [initialized, bootstrap]);
}
