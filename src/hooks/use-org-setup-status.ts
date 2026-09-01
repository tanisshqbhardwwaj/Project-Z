"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type { OrgSetupStatus } from "@/services/org/org-setup-status.service";

export function useOrgSetupStatus() {
  const [status, setStatus] = useState<OrgSetupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<OrgSetupStatus>("/api/v1/organizations/setup-status")
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, loading };
}
