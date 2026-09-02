"use client";

import { signOut } from "next-auth/react";
import { useAuthStore } from "@/stores/auth-store";
import { clearNativeTokens } from "@/platform/common/native-tokens";

export async function logoutUser() {
  useAuthStore.getState().logout();
  await clearNativeTokens();
  await signOut({ callbackUrl: "/login" });
}
