"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { EmptyState, PageHeader } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR } from "@/lib/finance/money";
import { Badge } from "@/components/ui/badge";

type PackageRow = {
  id: string;
  name: string;
  type: string;
  pricePaise: string;
  sessionCount: number | null;
  prepaidValuePaise: string | null;
  validityDays: number | null;
  isActive: boolean;
  _count?: { customerPackages: number };
};

const PACKAGE_TYPES = [
  { value: "SESSION_PACK", label: "Session pack" },
  { value: "PREPAID_VALUE", label: "Prepaid value" },
  { value: "MEMBERSHIP", label: "Membership" },
];

export default function ServicePackagesPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const enabled = isModuleEnabled(enabledModules, "service_packages");
  const qc = useQueryClient();
  const { error, clear, applyError } = useFormFeedback();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("SESSION_PACK");
  const [priceRupees, setPriceRupees] = useState("");
  const [sessionCount, setSessionCount] = useState("");
  const [validityDays, setValidityDays] = useState("");

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: orgId ? queryKeys.modules.service.packages(orgId) : ["disabled"],
    queryFn: () =>
      apiFetch<{ packages: PackageRow[] }>("/api/v1/service/packages").then((r) =>
        Array.isArray(r) ? r : r.packages ?? []
      ),
    enabled: !!orgId && enabled,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/service/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          pricePaise: Math.round(Number(priceRupees) * 100),
          sessionCount: sessionCount ? Number(sessionCount) : undefined,
          validityDays: validityDays ? Number(validityDays) : undefined,
        }),
      }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.modules.service.packages(orgId) });
      setCreateOpen(false);
      setName("");
      setPriceRupees("");
      setSessionCount("");
      setValidityDays("");
    },
    onError: (e) => applyError(e),
  });

  if (!enabled) {
    return (
      <p className="text-muted-foreground">
        Turn on Packages in Manage Organization → Features.
      </p>
    );
  }

  if (isLoading) return <PageLoader label="Loading packages..." />;
  if (loadError) {
    return (
      <p className="text-destructive">
        {loadError instanceof Error ? loadError.message : "Failed to load packages"}
      </p>
    );
  }

  const packages = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Packages"
        description="Session packs, prepaid value, and memberships"
        actions={
          <Button size="lg" className="rounded-xl" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-5 w-5" />
            New package
          </Button>
        }
      />

      <FormFeedback error={error} />

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Active packages
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {packages.length === 0 ? (
            <EmptyState
              icon={Gift}
              title="No packages yet"
              description="Create a package to sell sessions or prepaid value."
            >
              <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>
                New package
              </Button>
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Sessions / validity</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {packages.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{pkg.name}</td>
                      <td className="px-4 py-3">{pkg.type.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 tabular-nums">{formatINR(pkg.pricePaise)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {pkg.sessionCount ? `${pkg.sessionCount} sessions` : "—"}
                        {pkg.validityDays ? ` · ${pkg.validityDays}d validity` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={pkg.isActive ? "default" : "secondary"}>
                          {pkg.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/service/packages/${pkg.id}`}>
                          <Button variant="outline" size="sm" className="rounded-xl">
                            Open
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create package</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="pkgName">Name</Label>
              <Input
                id="pkgName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkgPrice">Price (₹)</Label>
              <Input
                id="pkgPrice"
                type="number"
                min={0}
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value)}
                className="rounded-xl"
              />
            </div>
            {type === "SESSION_PACK" ? (
              <div className="space-y-2">
                <Label htmlFor="sessions">Session count</Label>
                <Input
                  id="sessions"
                  type="number"
                  min={1}
                  value={sessionCount}
                  onChange={(e) => setSessionCount(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="validity">Validity (days)</Label>
              <Input
                id="validity"
                type="number"
                min={1}
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button
              className="rounded-xl"
              disabled={!name.trim() || !priceRupees || createMutation.isPending}
              onClick={() => {
                clear();
                createMutation.mutate();
              }}
            >
              {createMutation.isPending ? "Creating…" : "Create package"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
