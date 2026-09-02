"use client";

import Link from "next/link";
import { GitBranch, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsPageHeader } from "@/components/settings/settings-page-shell";

export default function BranchesSettingsPage() {
  return (
    <div className="space-y-5">
      <SettingsPageHeader
        title="Multi-store branches"
        description="Run multiple shop locations under one organization."
      />

      <Card className="rounded-2xl border-dashed border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Add-on service
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Multi-store branches are not included in standard plans. When you purchase
            this add-on, our team enables it from the ops dashboard — you cannot turn
            it on yourself from settings.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Separate bill number series per branch</li>
            <li>Branch switcher in the shop app</li>
            <li>Shared or isolated customer ledger per branch</li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/settings/billing">
              <Button variant="outline" className="rounded-xl">
                View plans & billing
              </Button>
            </Link>
            <Link href="/settings/organization">
              <Button variant="ghost" className="rounded-xl">
                Back to organization
              </Button>
            </Link>
          </div>
          <p className="flex items-center gap-2 text-xs">
            <GitBranch className="h-3.5 w-3.5" />
            Already paid for multi-store? Contact support — we will activate it on your account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
