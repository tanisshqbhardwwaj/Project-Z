"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { PlanCards, type PlanCardData } from "@/components/billing/plan-cards";
import {
  SETUP_FEE_EARLY_BIRD_PAISE,
  SETUP_FEE_REGULAR_PAISE,
  formatINRFromPaise,
} from "@/lib/billing/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OpsPlansPage() {
  const [plans, setPlans] = useState<PlanCardData[]>([]);

  useEffect(() => {
    apiFetch<{ plans: PlanCardData[] }>("/api/v1/billing/plans").then((r) => setPlans(r.plans));
  }, []);

  if (!plans.length) return <PageLoader label="Loading catalog…" />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Pricing catalog</h2>
      <PlanCards plans={plans} readOnly />
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">One-time setup</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Regular {formatINRFromPaise(SETUP_FEE_REGULAR_PAISE)} · Early bird{" "}
          {formatINRFromPaise(SETUP_FEE_EARLY_BIRD_PAISE)} (first 100). Hardware not included.
        </CardContent>
      </Card>
    </div>
  );
}
