"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export type PlanCardData = {
  code: string;
  name: string;
  monthlyLabel: string;
  storageLabel: string;
  tagline: string;
  mostPopular?: boolean;
  features: string[];
  comingSoon?: string[];
  introLabel?: string | null;
};

type PlanCardsProps = {
  plans: PlanCardData[];
  currentPlan?: string;
  pendingPlan?: string | null;
  onSelect?: (code: string) => void;
  selecting?: string | null;
  readOnly?: boolean;
};

export function PlanCards({
  plans,
  currentPlan,
  pendingPlan,
  onSelect,
  selecting,
  readOnly,
}: PlanCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((plan) => {
        const isCurrent = currentPlan === plan.code;
        const isPending = pendingPlan === plan.code;
        return (
          <Card
            key={plan.code}
            className={cn(
              "relative flex flex-col rounded-2xl",
              plan.mostPopular && "border-primary shadow-md ring-1 ring-primary/20",
              isCurrent && "border-emerald-500/60 bg-emerald-500/5"
            )}
          >
            {plan.mostPopular ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                Most popular
              </span>
            ) : null}
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <p className="text-2xl font-bold">{plan.monthlyLabel}</p>
              {plan.introLabel ? (
                <p className="text-sm font-medium text-primary">{plan.introLabel}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">per month · {plan.storageLabel} cloud</p>
              <p className="text-sm text-muted-foreground">{plan.tagline}</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <ul className="space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{f}</span>
                  </li>
                ))}
                {(plan.comingSoon ?? []).map((f) => (
                  <li key={f} className="flex gap-2 text-muted-foreground">
                    <span className="mt-0.5 text-xs">Soon</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {!readOnly ? (
                <div className="mt-auto pt-2">
                  {isCurrent ? (
                    <Button className="w-full rounded-xl" disabled variant="secondary">
                      Current plan
                    </Button>
                  ) : isPending ? (
                    <Button className="w-full rounded-xl" disabled variant="outline">
                      Payment pending
                    </Button>
                  ) : (
                    <Button
                      className="w-full rounded-xl"
                      disabled={!!selecting}
                      onClick={() => onSelect?.(plan.code)}
                    >
                      {selecting === plan.code ? "Requesting…" : "Choose this plan"}
                    </Button>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function StorageUsageBar({
  usedLabel,
  quotaLabel,
  percent,
  label = "Cloud photos & files",
}: {
  usedLabel: string;
  quotaLabel: string;
  percent: number;
  label?: string;
}) {
  const pct = Math.min(100, Math.max(0, percent));
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {usedLabel} / {quotaLabel}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 90 ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct >= 100 ? (
        <p className="text-xs text-amber-600">
          Cloud full — billing still works. Delete photos or upgrade for more backup space.
        </p>
      ) : null}
    </div>
  );
}
