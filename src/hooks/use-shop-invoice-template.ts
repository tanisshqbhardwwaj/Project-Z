"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  resolveShopInvoiceTemplate,
  type ResolvedInvoiceTemplate,
} from "@/lib/org/shop-settings";

export function useShopInvoiceTemplate(): ResolvedInvoiceTemplate {
  const orgName = useAuthStore((s) => s.activeOrganizationName);
  const orgSettings = useAuthStore((s) => s.activeOrgSettings);

  return useMemo(
    () => resolveShopInvoiceTemplate(orgName ?? "Shop", orgSettings),
    [orgName, orgSettings]
  );
}
