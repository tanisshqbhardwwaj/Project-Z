"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { CustomerScope, MultiStoreSettings } from "@/lib/shop/multi-store";
import { deriveStoreCode } from "@/lib/shop/bill-number";

type BranchRow = {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
  address: string | null;
  phone: string | null;
};

export default function BranchesSettingsPage() {
  const { role, bootstrap } = useAuthStore();
  const isOwner = role === "OWNER";
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<MultiStoreSettings>({
    enabled: false,
    customerScope: "SHARED",
  });
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<{
        settings: MultiStoreSettings;
        branches: BranchRow[];
      }>("/api/v1/shop/branches?config=1");
      setSettings(data.settings);
      setBranches(data.branches);
    } catch (err) {
      toast({
        title: "Could not load branches",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveSettings(patch: Partial<MultiStoreSettings>) {
    if (!isOwner) return;
    setSaving(true);
    try {
      const next = await apiFetch<MultiStoreSettings>(
        "/api/v1/shop/branches/settings",
        { method: "PATCH", body: JSON.stringify(patch) }
      );
      setSettings(next);
      await bootstrap();
      toast({ title: "Multi-store settings saved" });
    } catch (err) {
      toast({
        title: "Could not save settings",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function addBranch() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/api/v1/shop/branches", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          code: codeTouched && newCode.trim() ? newCode.trim() : undefined,
        }),
      });
      setNewName("");
      setNewCode("");
      setCodeTouched(false);
      await load();
      toast({ title: "Branch added" });
    } catch (err) {
      toast({
        title: "Could not add branch",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader label="Loading branches…" />;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/settings/organization" className="hover:underline">
            Organization
          </Link>
          {" · "}Branches
        </p>
        <h1 className="text-2xl font-bold">Multi-store branches</h1>
        <p className="text-sm text-muted-foreground">
          Run multiple locations under one organization. Each branch gets its own bill
          number series and stock; choose whether customers are shared or isolated per branch.
        </p>
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="multi-store">Enable multi-store</Label>
              <p className="text-sm text-muted-foreground">
                Show branch switcher and allow multiple locations.
              </p>
            </div>
            <Switch
              id="multi-store"
              checked={settings.enabled}
              disabled={!isOwner || saving}
              onCheckedChange={(enabled) => void saveSettings({ enabled })}
            />
          </div>

          <div className="space-y-3">
            <Label>Customer ledger</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["SHARED", "Shared customers", "One customer list across all branches"],
                  ["ISOLATED", "Isolated per branch", "Separate udhaar and phone book per branch"],
                ] as const
              ).map(([value, title, desc]) => (
                <button
                  key={value}
                  type="button"
                  disabled={!isOwner || saving || !settings.enabled}
                  onClick={() => void saveSettings({ customerScope: value as CustomerScope })}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    settings.customerScope === value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  } ${!settings.enabled ? "opacity-50" : ""}`}
                >
                  <p className="font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Branches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y rounded-xl border">
            {branches.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">
                    {b.name}
                    {b.isDefault ? (
                      <span className="ml-2 text-xs text-muted-foreground">(default)</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-foreground">Code: {b.code}</p>
                </div>
              </div>
            ))}
          </div>

          {isOwner && settings.enabled ? (
            <>
              <div className="grid gap-3 sm:grid-cols-[1fr_100px_auto]">
                <Input
                  value={newName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewName(name);
                    if (!codeTouched) {
                      setNewCode(deriveStoreCode(name));
                    }
                  }}
                  placeholder="Branch name, e.g. Mall outlet"
                />
                <Input
                  value={newCode}
                  onChange={(e) => {
                    setCodeTouched(true);
                    setNewCode(e.target.value.toUpperCase());
                  }}
                  placeholder="Code"
                  maxLength={6}
                />
                <Button
                  className="h-11 rounded-xl"
                  disabled={saving || !newName.trim()}
                  onClick={() => void addBranch()}
                >
                  Add branch
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Branch code is used in bill numbers (e.g. BF/26-27/…). Leave blank to
                auto-generate from the branch name; each code must be unique.
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
