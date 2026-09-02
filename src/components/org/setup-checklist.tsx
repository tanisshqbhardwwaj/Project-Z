"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OrgSetupStatus } from "@/services/org/org-setup-status.service";

type SetupChecklistProps = {
  className?: string;
};

export function SetupChecklist({ className }: SetupChecklistProps) {
  const [status, setStatus] = useState<OrgSetupStatus | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    apiFetch<OrgSetupStatus>("/api/v1/organizations/setup-status")
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status || status.onboardingCompleteAt) return null;

  async function markComplete() {
    setCompleting(true);
    try {
      await apiFetch("/api/v1/organizations", {
        method: "PATCH",
        body: JSON.stringify({ onboardingComplete: true }),
      });
      setStatus((prev) =>
        prev
          ? { ...prev, onboardingCompleteAt: new Date().toISOString(), requiredComplete: true }
          : prev
      );
    } finally {
      setCompleting(false);
    }
  }

  return (
    <Card className={cn("rounded-2xl border-primary/20 shadow-md", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Finish setup</CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete these steps to get your organization production-ready.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 text-sm">
            {item.complete ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn(item.complete && "text-muted-foreground")}>
                {item.label}
                {item.optional ? (
                  <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
                ) : null}
              </p>
              {!item.complete && item.href ? (
                <Link href={item.href} className="text-xs font-medium text-primary hover:underline">
                  Set up →
                </Link>
              ) : null}
            </div>
          </div>
        ))}
        {status.requiredComplete ? (
          <Button
            className="mt-2 w-full rounded-xl"
            onClick={markComplete}
            disabled={completing}
          >
            {completing ? "Saving..." : "Mark setup complete"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
