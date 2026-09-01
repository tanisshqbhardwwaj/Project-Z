"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { StorageUsageBar } from "@/components/billing/plan-cards";
import { OpsPlanPill, OpsStatusPill } from "@/components/ops/ops-status-pill";
import { OpsPageHeader } from "@/components/ops/ops-page-header";
import { formatStorageBytes } from "@/lib/billing/plans";
import {
  modulesForBusinessType,
  moduleLabel,
  resolveEnabledModules,
  type ModuleKey,
  type OrgSettingsJson,
} from "@/lib/org/modules";
import { ADDON_CATALOG } from "@/lib/billing/addon-catalog";
import type { BusinessType, ShopSector } from "@prisma/client";

type OrgAddonRow = {
  id: string;
  addonKey: string;
  quantity: number;
  validUntil: string | null;
  createdAt: string;
};

const PLANS = ["BASIC", "BUSINESS", "PROFESSIONAL", "BUSINESS_PRO"] as const;

type OrgDetail = {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  shopSector: ShopSector | null;
  plan: string;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  accessExpiresAt: string | null;
  storageUsedBytes: string;
  storageQuotaBytes: string;
  setupFeeStatus: string;
  enableStaff: boolean;
  settings: OrgSettingsJson;
  onboardingCompleteAt: string | null;
  inventorySkuCount: number;
  inventorySkuCap: number | null;
  inventorySkuUsagePercent: number | null;
  lastActiveAt: string | null;
  createdAt: string;
  memberCount: number;
  staffCount: number;
  adminCount: number;
  members: Array<{
    id: string;
    role: string;
    status: string;
    joinedAt: string | null;
    user: { name: string; email: string; phone: string | null };
  }>;
  planRequests: Array<{
    id: string;
    fromPlan: string;
    toPlan: string;
    status: string;
    createdAt: string;
  }>;
};

export default function OpsCustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<{
    org: OrgDetail;
    planDef: { name: string };
    addons: OrgAddonRow[];
    multiStore: {
      settings: { enabled: boolean; customerScope: "SHARED" | "ISOLATED" };
      branches: Array<{ id: string; name: string; code: string; isDefault: boolean }>;
    } | null;
  } | null>(null);
  const [plan, setPlan] = useState<string>("");
  const [accessExpiresAt, setAccessExpiresAt] = useState<string>("");
  const [extendDays, setExtendDays] = useState("30");
  const [moduleToggles, setModuleToggles] = useState<Partial<Record<ModuleKey, boolean>>>({});
  const [grantAddonKey, setGrantAddonKey] = useState<string>("multi_store");
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchCode, setNewBranchCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<{
      org: OrgDetail;
      planDef: { name: string };
      addons: OrgAddonRow[];
      multiStore: {
        settings: { enabled: boolean; customerScope: "SHARED" | "ISOLATED" };
        branches: Array<{ id: string; name: string; code: string; isDefault: boolean }>;
      } | null;
    }>(`/api/v1/ops/organizations/${id}`);
    setData(res);
    setPlan(res.org.plan);
    setAccessExpiresAt(
      res.org.accessExpiresAt ? res.org.accessExpiresAt.slice(0, 10) : ""
    );
    const enabled = resolveEnabledModules({
      businessType: res.org.businessType,
      shopSector: res.org.shopSector,
      settings: res.org.settings,
      enableStaffLegacy: res.org.enableStaff,
    });
    setModuleToggles(enabled);
  }, [id]);

  useEffect(() => {
    setLoadError(null);
    load().catch((err) => {
      setLoadError(err instanceof Error ? err.message : "Failed to load customer");
    });
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      await apiFetch(`/api/v1/ops/organizations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  const availableModules = useMemo(() => {
    if (!data) return [];
    return modulesForBusinessType(data.org.businessType, data.org.shopSector);
  }, [data]);

  if (!data) {
    if (loadError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <div>
            <h2 className="text-xl font-semibold">Could not load customer</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{loadError}</p>
          </div>
          <Button
            className="rounded-xl"
            onClick={() => {
              setLoadError(null);
              load().catch((err) => {
                setLoadError(err instanceof Error ? err.message : "Failed to load customer");
              });
            }}
          >
            Try again
          </Button>
        </div>
      );
    }
    return <PageLoader label="Loading customer…" />;
  }

  const org = data.org;
  const addons = data.addons ?? [];
  const multiStore = data.multiStore;
  const hasMultiStoreAddon = addons.some((a) => a.addonKey === "multi_store");
  const used = Number(org.storageUsedBytes);
  const quota = Number(org.storageQuotaBytes);
  const owner = org.members.find((m) => m.role === "OWNER")?.user;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Link href="/ops/customers" className="text-sm text-muted-foreground hover:underline">
          ← Organizations
        </Link>
        <OpsPageHeader
          className="mt-2"
          title={org.name}
          description={`${owner?.name ?? "No owner"} · ${owner?.email ?? ""}${owner?.phone ? ` · ${owner.phone}` : ""}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <OpsPlanPill plan={org.plan} />
              <OpsStatusPill status={org.subscriptionStatus} />
            </div>
          }
        />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="service">Service control</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Slug" value={org.slug} />
                <Row label="Business type" value={org.businessType} />
                <Row label="Sector" value={org.shopSector ?? "—"} />
                <Row
                  label="Created"
                  value={new Date(org.createdAt).toLocaleDateString("en-IN")}
                />
                <Row
                  label="Last active"
                  value={
                    org.lastActiveAt
                      ? new Date(org.lastActiveAt).toLocaleString("en-IN")
                      : "Never"
                  }
                />
                <div className="flex items-center justify-between gap-3 border-t pt-2">
                  <div className="min-w-0">
                    <span className="text-muted-foreground">Onboarding</span>
                    {org.onboardingCompleteAt ? (
                      <p className="text-[11px] text-muted-foreground">
                        Done {new Date(org.onboardingCompleteAt).toLocaleDateString("en-IN")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs font-medium">
                      {org.onboardingCompleteAt ? "Complete" : "Pending"}
                    </span>
                    <Switch
                      checked={Boolean(org.onboardingCompleteAt)}
                      disabled={saving}
                      onCheckedChange={(checked) =>
                        patch({ onboardingComplete: checked })
                      }
                    />
                  </div>
                </div>
                {org.inventorySkuCap != null ? (
                  <Row
                    label="Inventory SKUs"
                    value={`${org.inventorySkuCount} / ${org.inventorySkuCap}${
                      org.inventorySkuUsagePercent != null &&
                      org.inventorySkuUsagePercent >= 80
                        ? " (near limit)"
                        : ""
                    }`}
                  />
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">People</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Members" value={String(org.memberCount)} />
                <Row label="Staff records" value={String(org.staffCount)} />
                <Row label="Owners/admins" value={String(org.adminCount)} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Access timeline</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
                <Row
                  label="Current period end"
                  value={
                    org.currentPeriodEnd
                      ? new Date(org.currentPeriodEnd).toLocaleString("en-IN")
                      : "—"
                  }
                />
                <Row
                  label="Founder access expiry"
                  value={
                    org.accessExpiresAt
                      ? new Date(org.accessExpiresAt).toLocaleString("en-IN")
                      : "Not set"
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="service">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Access control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Founder access expiry</Label>
                  <DatePicker
                    value={accessExpiresAt || undefined}
                    onChange={setAccessExpiresAt}
                    placeholder="No expiry set"
                    className="h-11"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      disabled={saving}
                      onClick={() =>
                        patch({
                          accessExpiresAt: accessExpiresAt
                            ? new Date(`${accessExpiresAt}T23:59:59.999Z`).toISOString()
                            : null,
                        })
                      }
                    >
                      Save expiry
                    </Button>
                    <Button
                      variant="ghost"
                      className="rounded-xl"
                      disabled={saving}
                      onClick={() => {
                        setAccessExpiresAt("");
                        void patch({ accessExpiresAt: null });
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label>Extend billing period</Label>
                  <div className="flex flex-wrap items-end gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={extendDays}
                      onChange={(e) => setExtendDays(e.target.value)}
                      className="w-24 rounded-xl"
                    />
                    <span className="pb-2 text-sm text-muted-foreground">days</span>
                    <Button
                      className="rounded-xl"
                      disabled={saving}
                      onClick={() =>
                        patch({ extendPeriodDays: Number(extendDays) || 30 })
                      }
                    >
                      Extend period
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {org.subscriptionStatus !== "CANCELLED" ? (
                    <Button
                      variant="destructive"
                      className="rounded-xl"
                      disabled={saving}
                      onClick={() => patch({ suspend: true })}
                    >
                      Suspend organization
                    </Button>
                  ) : (
                    <Button
                      className="rounded-xl"
                      disabled={saving}
                      onClick={() => patch({ reactivate: true, plan })}
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Module toggles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {availableModules.map((mod) => (
                  <div
                    key={mod.key}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {moduleLabel(mod.key, org.businessType, org.shopSector ? [org.shopSector] : null)}
                      </p>
                      <p className="text-xs text-muted-foreground">{mod.description}</p>
                    </div>
                    <Switch
                      checked={Boolean(moduleToggles[mod.key])}
                      onCheckedChange={(checked) =>
                        setModuleToggles((prev) => ({ ...prev, [mod.key]: checked }))
                      }
                    />
                  </div>
                ))}
                <Button
                  className="w-full rounded-xl"
                  disabled={saving}
                  onClick={() =>
                    patch({ settings: { modules: moduleToggles } })
                  }
                >
                  Save modules
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Plan add-ons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {org.inventorySkuCap != null ? (
                  <StorageUsageBar
                    label="Inventory SKUs"
                    usedLabel={String(org.inventorySkuCount)}
                    quotaLabel={String(org.inventorySkuCap)}
                    percent={org.inventorySkuUsagePercent ?? 0}
                    warningThreshold={80}
                    nearLimitMessage="Approaching plan SKU limit."
                    atLimitMessage="At SKU cap — new items blocked until upgrade."
                  />
                ) : null}
                {addons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active add-ons.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {addons.map((addon) => (
                      <li
                        key={addon.id}
                        className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                      >
                        <div>
                          <p className="font-medium">
                            {ADDON_CATALOG[addon.addonKey as keyof typeof ADDON_CATALOG]
                              ?.label ?? addon.addonKey}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Qty {addon.quantity}
                            {addon.validUntil
                              ? ` · until ${new Date(addon.validUntil).toLocaleDateString("en-IN")}`
                              : " · no expiry"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          disabled={saving}
                          onClick={() => patch({ revokeAddon: addon.addonKey })}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap items-end gap-2 border-t pt-4">
                  <div>
                    <Label>Grant add-on</Label>
                    <Select value={grantAddonKey} onValueChange={setGrantAddonKey}>
                      <SelectTrigger className="mt-1 w-56 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ADDON_CATALOG).map(([key, def]) => (
                          <SelectItem key={key} value={key}>
                            {def.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="rounded-xl"
                    disabled={saving}
                    onClick={() => patch({ grantAddon: { addonKey: grantAddonKey } })}
                  >
                    Grant add-on
                  </Button>
                </div>
              </CardContent>
            </Card>

            {(org.businessType === "SHOPKEEPER" || org.businessType === "SERVICE") && multiStore ? (
              <Card className="rounded-2xl lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Multi-store branches</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Grant the <strong>Multi-store branches</strong> add-on first, then enable
                    locations and customer ledger mode here.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!hasMultiStoreAddon ? (
                    <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                      Add-on not granted yet. Use Plan add-ons above to grant{" "}
                      <strong>Multi-store branches</strong>, then return here to configure.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <Label htmlFor="ops-multi-store">Enable multi-store</Label>
                          <p className="text-sm text-muted-foreground">
                            Shows branch switcher when more than one branch exists.
                          </p>
                        </div>
                        <Switch
                          id="ops-multi-store"
                          checked={multiStore.settings.enabled}
                          disabled={saving}
                          onCheckedChange={(enabled) => patch({ multiStore: { enabled } })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Customer ledger</Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(
                            [
                              ["SHARED", "Shared customers", "One list across branches"],
                              ["ISOLATED", "Isolated per branch", "Separate udhaar per branch"],
                            ] as const
                          ).map(([value, title, desc]) => (
                            <button
                              key={value}
                              type="button"
                              disabled={saving || !multiStore.settings.enabled}
                              onClick={() =>
                                patch({ multiStore: { customerScope: value } })
                              }
                              className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                                multiStore.settings.customerScope === value
                                  ? "border-primary bg-primary/5"
                                  : "hover:bg-muted/50"
                              } ${!multiStore.settings.enabled ? "opacity-50" : ""}`}
                            >
                              <p className="font-medium">{title}</p>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Branches</Label>
                        <ul className="divide-y rounded-xl border text-sm">
                          {multiStore.branches.map((b) => (
                            <li key={b.id} className="flex justify-between px-3 py-2">
                              <span>
                                {b.name}
                                {b.isDefault ? (
                                  <span className="ml-2 text-xs text-muted-foreground">(default)</span>
                                ) : null}
                              </span>
                              <span className="text-muted-foreground">{b.code}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Input
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            placeholder="Branch name"
                            className="max-w-xs rounded-xl"
                          />
                          <Input
                            value={newBranchCode}
                            onChange={(e) => setNewBranchCode(e.target.value.toUpperCase())}
                            placeholder="Code"
                            className="w-24 rounded-xl"
                            maxLength={6}
                          />
                          <Button
                            className="rounded-xl"
                            disabled={saving || !newBranchName.trim() || !multiStore.settings.enabled}
                            onClick={async () => {
                              await patch({
                                createBranch: {
                                  name: newBranchName.trim(),
                                  code: newBranchCode.trim() || undefined,
                                },
                              });
                              setNewBranchName("");
                              setNewBranchCode("");
                            }}
                          >
                            Add branch
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="members">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Members</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Role</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {org.members.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium">{m.user.name}</p>
                        <p className="text-xs text-muted-foreground">{m.user.email}</p>
                      </td>
                      <td className="py-2.5 pr-4">{m.role}</td>
                      <td className="py-2.5 pr-4">{m.status}</td>
                      <td className="py-2.5 text-muted-foreground">
                        {m.joinedAt
                          ? new Date(m.joinedAt).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Subscription & billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Plan: <strong>{data.planDef.name}</strong> ({org.plan}) · Status:{" "}
                <OpsStatusPill status={org.subscriptionStatus} className="ml-1 inline-flex" />
              </p>
              <StorageUsageBar
                usedLabel={formatStorageBytes(used)}
                quotaLabel={formatStorageBytes(quota)}
                percent={quota ? (used / quota) * 100 : 0}
              />
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <Label>Assign plan</Label>
                  <Select value={plan} onValueChange={setPlan}>
                    <SelectTrigger className="w-48 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLANS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="rounded-xl"
                  disabled={saving}
                  onClick={() => patch({ plan, activatePlan: true })}
                >
                  Activate after payment
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={saving}
                  onClick={() => patch({ setupFeeStatus: "PAID" })}
                >
                  Mark setup paid
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={saving}
                  onClick={() => patch({ setupFeeStatus: "WAIVED" })}
                >
                  Waive setup fee
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Setup fee status: {org.setupFeeStatus}
              </p>

              {org.planRequests?.length ? (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-medium">Recent plan requests</p>
                  {org.planRequests.map((r) => (
                    <div
                      key={r.id}
                      className="flex justify-between border-b py-2 text-sm last:border-0"
                    >
                      <span>
                        {r.fromPlan} → {r.toPlan} ({r.status})
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
