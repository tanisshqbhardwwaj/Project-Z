"use client";

import { signOut } from "next-auth/react";
import { useAuthStore } from "@/stores/auth-store";

export async function logoutUser() {
  useAuthStore.getState().logout();
  await signOut({ callbackUrl: "/login" });
}
