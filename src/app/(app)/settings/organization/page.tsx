"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch, setActiveOrganizationId } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { requireField } from "@/lib/api/validation";
import {
  BUSINESS_TYPE_CONFIG,
  BUSINESS_TYPES,
  type BusinessType,
} from "@/lib/org/business-type";
import {
  SHOP_SECTOR_CONFIG,
  SHOP_SECTORS,
  isShopSector,
  type ShopSector,
} from "@/lib/org/shop-sector";
import {
  resolveCustomBusinessTypeLabel,
  resolveShopBusinessTypes,
} from "@/lib/org/shop-settings";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  modulesForBusinessType,
  moduleLabel,
  type ModuleKey,
  type OrgSettingsJson,
} from "@/lib/org/modules";

type OrgData = {
  id: string;
  name: string;
  businessType: BusinessType;
  shopSector?: ShopSector | null;
  enableStaff?: boolean;
  timezone?: string;
  settings?: OrgSettingsJson;
  defaultCompletionDays: number;
};

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { update } = useSession();
  const { role, activeOrganizationId, setActiveOrg, bootstrap } = useAuthStore();
  const isOwner = role === "OWNER";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [canDeleteOrg, setCanDeleteOrg] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("CONTRACTOR");
  const [businessTypes, setBusinessTypes] = useState<ShopSector[]>(["GENERAL"]);
  const [customBusinessType, setCustomBusinessType] = useState("");
  const [enableStaff, setEnableStaff] = useState(false);
  const [moduleToggles, setModuleToggles] = useState<Partial<Record<ModuleKey, boolean>>>({});
  const [unmarkedPolicy, setUnmarkedPolicy] = useState<"PRESENT" | "ABSENT" | "EXCLUDED">("EXCLUDED");
  const [defaultCompletionDays, setDefaultCompletionDays] = useState("30");
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiFetch<OrgData>("/api/v1/organizations"),
      fetch("/api/v1/organizations/list").then((r) => r.json()),
    ])
      .then(([org, listPayload]) => {
        if (cancelled) return;
        setName(org.name);
        setBusinessType(org.businessType ?? "CONTRACTOR");
        setBusinessTypes(
          resolveShopBusinessTypes(
            org.settings ?? {},
            org.shopSector ?? null
          ).filter(isShopSector)
        );
        setCustomBusinessType(
          resolveCustomBusinessTypeLabel(org.settings ?? {}) ?? ""
        );
        setEnableStaff(Boolean(org.enableStaff));
        setModuleToggles(org.settings?.modules ?? {});
        setUnmarkedPolicy(org.settings?.unmarkedDayPolicy ?? "EXCLUDED");
        setDefaultCompletionDays(String(org.defaultCompletionDays ?? 30));
        setBrandName(org.settings?.shop?.brandName ?? "");
        setLogoUrl(org.settings?.shop?.logoUrl ?? null);

        const orgs = listPayload.data?.organizations ?? [];
        const current = orgs.find((o: { id: string }) => o.id === org.id);
        setCanDeleteOrg(Boolean(current?.canDelete));
      })
      .catch((err) => {
        if (!cancelled) applyError(err, "Failed to load organization");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyError]);

  /**
   * Adds or removes a business type. Removing the last one is blocked, and the
   * first entry stays the primary type used by the legacy `shopSector` column.
   */
  function toggleBusinessType(sector: ShopSector) {
    setBusinessTypes((prev) => {
      if (prev.includes(sector)) {
        const next = prev.filter((s) => s !== sector);
        return next.length > 0 ? next : prev;
      }
      return [...prev, sector];
    });
  }

  async function save() {
    clear();
    setSavedMessage("");

    const nameError = requireField(name, "organization name");
    if (nameError) {
      showWarning(nameError);
      return;
    }

    if (businessType === "SHOPKEEPER" && businessTypes.length === 0) {
      showWarning("Select at least one business type");
      return;
    }
    if (
      businessType === "SHOPKEEPER" &&
      businessTypes.includes("OTHER") &&
      !customBusinessType.trim()
    ) {
      showWarning("Tell us what your custom business type is");
      return;
    }

    const days = Number(defaultCompletionDays);
    if (!Number.isFinite(days) || days < 1) {
      showWarning("Default completion days must be at least 1");
      return;
    }

    setSaving(true);
    try {
      const updated = await apiFetch<OrgData>("/api/v1/organizations", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          businessType,
          defaultCompletionDays: days,
          ...(businessType === "SHOPKEEPER"
            ? {
                shopBusinessTypes: businessTypes,
                shopCustomBusinessType: businessTypes.includes("OTHER")
                  ? customBusinessType.trim()
                  : null,
              }
            : { shopSector: null }),
          settings: {
            modules: {
              ...moduleToggles,
              staff: moduleToggles.staff ?? enableStaff,
            },
            unmarkedDayPolicy: unmarkedPolicy,
            ...(businessType === "SHOPKEEPER"
              ? {
                  shop: {
                    brandName: brandName.trim() || undefined,
                    logoUrl,
                  },
                }
              : {}),
          },
        }),
      });
      setActiveOrg(
        updated.id,
        updated.name,
        role ?? "OWNER",
        updated.businessType,
        updated.shopSector ?? null,
        Boolean(updated.settings?.modules?.staff ?? updated.enableStaff),
        updated.settings?.modules ?? {},
        updated.timezone ?? "Asia/Kolkata",
        null,
        null,
        updated.settings ?? null
      );
      await bootstrap();
      setSavedMessage("Organization updated");
    } catch (err) {
      applyError(err, "Failed to update organization");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrganization() {
    if (!activeOrganizationId) return;
    clear();
    setDeleting(true);
    try {
      const result = await apiFetch<{
        nextOrganizationId: string;
        nextOrganizationName: string;
        deletedOrganizationName: string;
      }>(`/api/v1/organizations/${activeOrganizationId}`, {
        method: "DELETE",
      });

      await fetch("/api/v1/organizations/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: result.nextOrganizationId }),
      });
      await update({ activeOrganizationId: result.nextOrganizationId });
      setActiveOrganizationId(result.nextOrganizationId);
      await bootstrap();
      setDeleteOpen(false);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      applyError(err, "Failed to delete organization");
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <PageLoader label="Loading organization..." />;

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Manage Organization</h1>
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "Update your organization name, business type, and defaults."
            : "Only the owner can edit organization settings."}
        </p>
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Organization details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormFeedback warning={warning} error={error} />
          {savedMessage ? (
            <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {savedMessage}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl"
              disabled={!isOwner}
            />
          </div>

          <div className="space-y-2">
            <Label>Business type</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {BUSINESS_TYPES.map((type) => {
                const config = BUSINESS_TYPE_CONFIG[type];
                const active = businessType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={!isOwner}
                    onClick={() => setBusinessType(type)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors disabled:opacity-60",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-accent/50"
                    )}
                  >
                    <p className="text-sm font-semibold">{config.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{config.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {businessType === "SHOPKEEPER" && (
            <div className="space-y-2">
              <Label>My business is</Label>
              <p className="text-xs text-muted-foreground">
                Pick every type you trade in. Product categories and the fields on
                the product form adapt to your selection. The first one you pick is
                your primary type.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SHOP_SECTORS.map((sector) => {
                  const config = SHOP_SECTOR_CONFIG[sector];
                  const active = businessTypes.includes(sector);
                  const isPrimary = businessTypes[0] === sector;
                  return (
                    <button
                      key={sector}
                      type="button"
                      disabled={!isOwner}
                      onClick={() => toggleBusinessType(sector)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors disabled:opacity-60",
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-accent/50"
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{config.label}</span>
                        {active ? (
                          <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                            {isPrimary ? "Primary" : "✓"}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {config.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              {businessTypes.includes("OTHER") ? (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="custom-business-type">
                    What is your business? (custom type)
                  </Label>
                  <Input
                    id="custom-business-type"
                    value={customBusinessType}
                    onChange={(e) => setCustomBusinessType(e.target.value)}
                    className="h-12 rounded-xl"
                    placeholder="e.g. Mobile Repair & Accessories"
                    disabled={!isOwner}
                    maxLength={120}
                  />
                </div>
              ) : null}

              <p className="pt-1 text-xs text-muted-foreground">
                Need a category we don&apos;t list? Add your own from{" "}
                <Link href="/shop/inventory" className="text-primary hover:underline">
                  Inventory → Category
                </Link>
                .
              </p>
            </div>
          )}

          {businessType === "SHOPKEEPER" && (
            <Card className="rounded-2xl border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Shop label printing</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Small tags show brand name. Full tags show shop name, logo, product details, and price.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-name">Brand name (small tags)</Label>
                  <Input
                    id="brand-name"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="h-12 rounded-xl"
                    placeholder={name || "Your brand"}
                    disabled={!isOwner}
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown on compact barcode stickers. Leave blank to use organization name.
                    Also used on invoices when display name is not set.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-logo">Shop logo (full tags)</Label>
                  <Input
                    id="shop-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="h-12 rounded-xl"
                    disabled={!isOwner}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 200_000) {
                        showWarning("Logo must be under 200 KB");
                        e.target.value = "";
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => setLogoUrl(String(reader.result));
                      reader.readAsDataURL(file);
                    }}
                  />
                  {logoUrl ? (
                    <div className="flex items-center gap-3 rounded-xl border p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoUrl} alt="Shop logo" className="h-10 w-10 object-contain" />
                      <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                        Logo appears on full-size price tags and invoices (when enabled)
                      </div>
                      {isOwner && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-xl text-destructive"
                          onClick={() => setLogoUrl(null)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )}

          {businessType === "SHOPKEEPER" && (
            <Card className="rounded-2xl border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Invoice template</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Header, shop GSTIN, footer text, and which fields appear on printed invoices.
                </p>
              </CardHeader>
              <CardContent>
                <Link href="/shop/invoices/settings">
                  <Button variant="outline" className="rounded-xl">
                    Open invoice settings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {modulesForBusinessType(businessType, businessTypes[0] ?? null).map((mod) => {
                const on = Boolean(
                  moduleToggles[mod.key] ??
                    (mod.key === "staff" ? enableStaff : mod.defaultOn[businessType])
                );
                return (
                  <div
                    key={mod.key}
                    className="flex items-start gap-3 rounded-xl border p-3 sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {moduleLabel(mod.key, businessType)}
                      </p>
                      <p className="text-xs text-muted-foreground">{mod.description}</p>
                    </div>
                    <Switch
                      checked={on}
                      disabled={!isOwner}
                      onCheckedChange={(next) =>
                        setModuleToggles((prev) => ({
                          ...prev,
                          [mod.key]: next,
                        }))
                      }
                    />
                  </div>
                );
              })}
              <div className="space-y-2">
                <Label>Unmarked working days count as</Label>
                <select
                  value={unmarkedPolicy}
                  disabled={!isOwner}
                  onChange={(e) =>
                    setUnmarkedPolicy(
                      e.target.value as "PRESENT" | "ABSENT" | "EXCLUDED"
                    )
                  }
                  className="h-12 w-full rounded-xl border bg-background px-3"
                >
                  <option value="EXCLUDED">Working (full month for monthly salary)</option>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="completion-days">Default completion days</Label>
            <Input
              id="completion-days"
              type="number"
              min={1}
              max={3650}
              value={defaultCompletionDays}
              onChange={(e) => setDefaultCompletionDays(e.target.value)}
              className="h-12 rounded-xl"
              disabled={!isOwner}
            />
          </div>

          {isOwner && (
            <Button
              className="h-12 w-full rounded-xl"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save organization"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardContent className="space-y-3 pt-6">
          <Link href="/settings/members">
            <Button variant="outline" className="h-12 w-full justify-start rounded-xl">
              <Users className="mr-2 h-4 w-4" />
              Manage Members
            </Button>
          </Link>
          {(moduleToggles.staff ?? enableStaff) && (
            <Link href="/staff">
              <Button variant="outline" className="h-12 w-full justify-start rounded-xl">
                Open Staff / Labour hub
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      {canDeleteOrg && isOwner && (
        <Card className="rounded-2xl border-destructive/30 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Delete organization</CardTitle>
            <p className="text-sm text-muted-foreground">
              Remove this secondary organization and all its data. Your primary
              organization cannot be deleted.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="h-12 w-full rounded-xl"
              onClick={() => setDeleteOpen(true)}
            >
              Delete this organization
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes all projects, expenses, sales, staff records,
              and other data in this organization. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={deleteOrganization}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Yes, delete forever"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Link href="/settings/profile" className="block text-center text-sm text-muted-foreground hover:underline">
        Back to profile
      </Link>
    </div>
  );
}
