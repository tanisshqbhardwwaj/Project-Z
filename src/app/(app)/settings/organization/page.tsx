"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
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
  isShopVertical,
  type BusinessType,
} from "@/lib/org/business-type";
import { selectableBusinessTypes } from "@/lib/org/service-vertical";
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
import {
  ChevronRight,
  Package,
  Users,
  UsersRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrgModuleToggles } from "@/components/org/org-module-toggles";
import { useActivePlan } from "@/hooks/use-active-plan";
import { useOrgAddons } from "@/hooks/use-org-addons";
import {
  SettingsPageHeader,
  SettingsCardGrid,
  settingsCardClass,
} from "@/components/settings/settings-page-shell";
import {
  type ModuleKey,
  type OrgSettingsJson,
  normalizeModuleToggleMap,
  serializeModuleTogglesForApi,
} from "@/lib/org/modules";
import {
  DEFAULT_STAFF_BARCODE_LABEL,
  readStaffBarcodeLabelSettings,
  type StaffBarcodeLabelFields,
} from "@/lib/staff/barcode-label-settings";
import { StaffBarcodeLabelSettingsCard } from "@/components/staff/staff-barcode-label-settings";

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

type OrgFormSnapshot = {
  name: string;
  businessType: BusinessType;
  businessTypes: ShopSector[];
  customBusinessType: string;
  enableStaff: boolean;
  moduleToggles: Partial<Record<ModuleKey, boolean>>;
  unmarkedPolicy: "PRESENT" | "ABSENT" | "EXCLUDED";
  defaultCompletionDays: string;
  brandName: string;
  logoUrl: string | null;
  staffBarcodeLabel: StaffBarcodeLabelFields;
};

function SectionCard({
  title,
  description,
  children,
  className,
  variant = "default",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "danger";
}) {
  return (
    <Card
      className={cn(
        settingsCardClass,
        variant === "danger" && "border-destructive/30",
        className
      )}
    >
      <CardHeader className="space-y-1 pb-2">
        <CardTitle
          className={cn(
            "text-xs font-semibold uppercase tracking-wider leading-none",
            variant === "danger" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {title}
        </CardTitle>
        {description ? (
          <p className="text-sm normal-case leading-snug text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function QuickLinkRow({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-accent/50"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

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
  const [initialBusinessType, setInitialBusinessType] = useState<BusinessType>("CONTRACTOR");
  const [businessTypes, setBusinessTypes] = useState<ShopSector[]>(["GENERAL"]);
  const [customBusinessType, setCustomBusinessType] = useState("");
  const [enableStaff, setEnableStaff] = useState(false);
  const [moduleToggles, setModuleToggles] = useState<Partial<Record<ModuleKey, boolean>>>({});
  const [unmarkedPolicy, setUnmarkedPolicy] = useState<"PRESENT" | "ABSENT" | "EXCLUDED">("EXCLUDED");
  const [defaultCompletionDays, setDefaultCompletionDays] = useState("30");
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [staffBarcodeLabel, setStaffBarcodeLabel] = useState<StaffBarcodeLabelFields>({
    ...DEFAULT_STAFF_BARCODE_LABEL,
  });
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const plan = useActivePlan();
  const { addonKeys } = useOrgAddons();
  const [initialSnapshot, setInitialSnapshot] = useState<OrgFormSnapshot | null>(null);

  function applySnapshot(snapshot: OrgFormSnapshot) {
    setName(snapshot.name);
    setBusinessType(snapshot.businessType);
    setInitialBusinessType(snapshot.businessType);
    setBusinessTypes(snapshot.businessTypes);
    setCustomBusinessType(snapshot.customBusinessType);
    setEnableStaff(snapshot.enableStaff);
    setModuleToggles(snapshot.moduleToggles);
    setUnmarkedPolicy(snapshot.unmarkedPolicy);
    setDefaultCompletionDays(snapshot.defaultCompletionDays);
    setBrandName(snapshot.brandName);
    setLogoUrl(snapshot.logoUrl);
    setStaffBarcodeLabel(snapshot.staffBarcodeLabel);
  }

  function buildSnapshot(org: OrgData): OrgFormSnapshot {
    const sectors = resolveShopBusinessTypes(org.settings ?? {}, org.shopSector ?? null).filter(
      isShopSector
    );
    return {
      name: org.name,
      businessType: org.businessType ?? "CONTRACTOR",
      businessTypes: sectors,
      customBusinessType: resolveCustomBusinessTypeLabel(org.settings ?? {}) ?? "",
      enableStaff: Boolean(org.enableStaff),
      moduleToggles: normalizeModuleToggleMap(
        org.settings?.modules,
        Boolean(org.enableStaff)
      ),
      unmarkedPolicy: org.settings?.unmarkedDayPolicy ?? "EXCLUDED",
      defaultCompletionDays: String(org.defaultCompletionDays ?? 30),
      brandName: org.settings?.shop?.brandName ?? "",
      logoUrl: org.settings?.shop?.logoUrl ?? null,
      staffBarcodeLabel: readStaffBarcodeLabelSettings(org.settings),
    };
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiFetch<OrgData>("/api/v1/organizations"),
      fetch("/api/v1/organizations/list").then((r) => r.json()),
    ])
      .then(([org, listPayload]) => {
        if (cancelled) return;
        const snapshot = buildSnapshot(org);
        applySnapshot(snapshot);
        setInitialSnapshot(snapshot);

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
            modules: serializeModuleTogglesForApi(moduleToggles, enableStaff),
            unmarkedDayPolicy: unmarkedPolicy,
            staffBarcodeLabel,
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
      setInitialSnapshot({
        name: updated.name,
        businessType: updated.businessType ?? businessType,
        businessTypes: businessType === "SHOPKEEPER" ? businessTypes : [],
        customBusinessType,
        enableStaff: Boolean(updated.settings?.modules?.staff ?? updated.enableStaff),
        moduleToggles: normalizeModuleToggleMap(
          updated.settings?.modules ?? moduleToggles,
          Boolean(updated.settings?.modules?.staff ?? updated.enableStaff)
        ),
        unmarkedPolicy,
        defaultCompletionDays: String(updated.defaultCompletionDays ?? days),
        brandName,
        logoUrl,
        staffBarcodeLabel,
      });
      setInitialBusinessType(updated.businessType ?? businessType);
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

  function handleCancel() {
    if (!initialSnapshot) return;
    clear();
    setSavedMessage("");
    applySnapshot(initialSnapshot);
  }

  const staffEnabled = Boolean(moduleToggles.staff ?? enableStaff);
  const inventoryEnabled = Boolean(moduleToggles.shop_inventory ?? isShopVertical(businessType));

  if (loading) return <PageLoader label="Loading organization..." />;

  return (
    <div className="space-y-4 pb-20">
      <SettingsPageHeader
        title="Organization Settings"
        description={
          isOwner
            ? "Manage your organization profile, features and defaults."
            : "Only the owner can edit organization settings."
        }
      />

      <div className="space-y-3">
        <FormFeedback warning={warning} error={error} />
        {savedMessage ? (
          <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
            {savedMessage}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        <SectionCard title="Organization">
          <div className="space-y-4">
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
              {businessType !== initialBusinessType ? (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Changing business type resets your setup checklist. Save to apply.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {selectableBusinessTypes(businessType).map((type) => {
                  const config = BUSINESS_TYPE_CONFIG[type];
                  const active = businessType === type;
                  const shortLabel =
                    type === "SHOPKEEPER"
                      ? "Shop"
                      : type === "CONTRACTOR"
                        ? "Contractor"
                        : type === "ARCHITECT"
                          ? "Architect"
                          : config.label;
                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={!isOwner}
                      onClick={() => setBusinessType(type)}
                      className={cn(
                        "rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60",
                        active
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                          : "border-border hover:bg-accent/50"
                      )}
                    >
                      {shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>

        {businessType === "SHOPKEEPER" ? (
          <SectionCard
            title="Shop trade / sector"
            description="Select the sectors your shop operates in."
          >
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                        "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-60",
                        active
                          ? "border-primary bg-primary/10 font-medium text-primary ring-1 ring-primary"
                          : "border-border hover:bg-accent/50"
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{config.label}</span>
                        {active && isPrimary ? (
                          <span className="text-[10px] uppercase tracking-wide opacity-80">
                            Primary
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              {businessTypes.includes("OTHER") ? (
                <div className="space-y-1.5">
                  <Label htmlFor="custom-business-type">Custom business type</Label>
                  <Input
                    id="custom-business-type"
                    value={customBusinessType}
                    onChange={(e) => setCustomBusinessType(e.target.value)}
                    className="h-12 max-w-md rounded-xl"
                    placeholder="e.g. Mobile Repair & Accessories"
                    disabled={!isOwner}
                    maxLength={120}
                  />
                </div>
              ) : null}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard title="Features">
          <OrgModuleToggles
            businessType={businessType}
            primaryShopSector={businessTypes[0] ?? null}
            plan={plan}
            activeAddonKeys={addonKeys}
            moduleToggles={moduleToggles}
            enableStaff={enableStaff}
            disabled={!isOwner}
            onToggle={(key, next) =>
              setModuleToggles((prev) => ({
                ...prev,
                [key]: next,
              }))
            }
          />
        </SectionCard>

        {isShopVertical(businessType) ? (
          <SettingsCardGrid className="gap-4 lg:gap-5">
            <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
              <SectionCard title="Defaults">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Unmarked days</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="completion-days">Completion days</Label>
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
                </div>
              </SectionCard>

              {staffEnabled ? (
                <StaffBarcodeLabelSettingsCard
                  value={staffBarcodeLabel}
                  disabled={!isOwner}
                  onChange={setStaffBarcodeLabel}
                />
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
              <SectionCard
                title="Shop label printing"
                description="Brand name and logo on price tags."
              >
                <div className="space-y-4">
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
                        {isOwner ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto rounded-xl text-destructive"
                            onClick={() => setLogoUrl(null)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Invoice template"
                description="Header, GSTIN, footer and print fields."
              >
                <Link href="/shop/invoices/settings">
                  <Button variant="outline" className="rounded-xl">
                    Configure invoice template
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </SectionCard>
            </div>
          </SettingsCardGrid>
        ) : (
          <div className="space-y-4">
            <SectionCard title="Defaults">
              <div className="grid gap-4 sm:grid-cols-2 sm:max-w-2xl">
                <div className="space-y-2">
                  <Label>Unmarked days</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="completion-days">Completion days</Label>
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
              </div>
            </SectionCard>

            {staffEnabled ? (
              <StaffBarcodeLabelSettingsCard
                value={staffBarcodeLabel}
                disabled={!isOwner}
                onChange={setStaffBarcodeLabel}
              />
            ) : null}
          </div>
        )}

        <SectionCard title="Quick links">
          <div className="space-y-1.5">
            <QuickLinkRow href="/settings/members" icon={UsersRound} label="Members" />
            {staffEnabled ? (
              <QuickLinkRow href="/staff" icon={Users} label="Staff" />
            ) : null}
            {inventoryEnabled ? (
              <QuickLinkRow href="/shop/inventory" icon={Package} label="Inventory" />
            ) : null}
          </div>
        </SectionCard>

        {canDeleteOrg && isOwner ? (
          <SectionCard title="Danger zone" variant="danger">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Delete this organization</p>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. Your primary organization cannot be deleted.
                </p>
              </div>
              <Button
                variant="destructive"
                className="shrink-0 rounded-xl"
                onClick={() => setDeleteOpen(true)}
              >
                Delete organization
              </Button>
            </div>
          </SectionCard>
        ) : null}
      </div>

      {isOwner ? (
        <div className="sticky bottom-0 z-20 -mx-1 border-t bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={saving || !initialSnapshot}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={saving}
              onClick={save}
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      ) : null}

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
    </div>
  );
}
