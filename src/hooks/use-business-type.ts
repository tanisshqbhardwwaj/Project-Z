"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  getBusinessTypeConfig,
  type BusinessTypeConfig,
} from "@/lib/org/business-type";

export function useBusinessType(): BusinessTypeConfig {
  const activeBusinessType = useAuthStore((s) => s.activeBusinessType);
  return useMemo(
    () => getBusinessTypeConfig(activeBusinessType),
    [activeBusinessType]
  );
}
