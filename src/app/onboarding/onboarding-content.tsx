"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, setActiveOrganizationId } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { logoutUser } from "@/lib/auth/logout-client";
import { AppLogo } from "@/components/brand/app-logo";
import { AppearanceMenu } from "@/components/theme/appearance-menu";
import { OrgModuleToggles } from "@/components/org/org-module-toggles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";
import { FormFeedback } from "@/components/ui/form-feedback";
import { FieldHint } from "@/components/ui/field-hint";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { FIELD_LIMITS, requireOrganizationName } from "@/lib/api/validation";
import {
  BUSINESS_TYPE_CONFIG,
  isShopVertical,
  type BusinessType,
} from "@/lib/org/business-type";
import { onboardingBusinessTypes } from "@/lib/org/service-vertical";
import {
  SHOP_SECTOR_CONFIG,
  type ShopSector,
} from "@/lib/org/shop-sector";
import {
  OFFERING_OPTIONS,
  defaultSectorsForOffering,
  sectorsForOffering,
  type ShopOfferingKind,
} from "@/lib/shop/branch/onboarding-sectors";
import { moduleLabel, type ModuleKey } from "@/lib/org/modules";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import type { BillingPlan } from "@prisma/client";

const STEP_LABELS = ["Basics", "Profile", "Features", "Defaults", "Review"] as const;

export default function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewOrg = searchParams.get("new") === "1";
  const stepParam = Number(searchParams.get("step") ?? "1");
  const step = Number.isFinite(stepParam) ? Math.min(5, Math.max(1, stepParam)) : 1;

  const { bootstrap, status, initialized } = useAuthStore();
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("CONTRACTOR");
  const [businessTypes, setBusinessTypes] = useState<ShopSector[]>(["CLOTHING"]);
  const [offeringKind, setOfferingKind] = useState<ShopOfferingKind>("PRODUCTS");
  const [customBusinessType, setCustomBusinessType] = useState("");
  const [enableStaff, setEnableStaff] = useState(false);
  const [moduleToggles, setModuleToggles] = useState<Partial<Record<ModuleKey, boolean>>>({});
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [defaultCompletionDays, setDefaultCompletionDays] = useState("30");
  const [brandName, setBrandName] = useState("");
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const [loading, setLoading] = useState(false);
  const [orgCount, setOrgCount] = useState(0);

  const plan: BillingPlan = isShopVertical(businessType) ? "BASIC" : "BUSINESS";

  useEffect(() => {
    if (!initialized) bootstrap();
  }, [initialized, bootstrap]);

  useEffect(() => {
    fetch("/api/v1/organizations/list")
      .then((r) => r.json())
      .then((d) => {
        const count = d.data?.organizations?.length ?? 0;
        setOrgCount(count);
        if (count > 0 && !isNewOrg && status === "authenticated") {
          router.replace("/dashboard");
        }
      });
  }, [isNewOrg, router, status]);

  function goToStep(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", String(next));
    if (isNewOrg) params.set("new", "1");
    router.push(`/onboarding?${params.toString()}`);
  }

  function validateStep(current: number): boolean {
    clear();
    if (current === 1) {
      const msg = requireOrganizationName(name);
      if (msg) {
        showWarning(msg);
        return false;
      }
    }
    if (current === 2 && businessType === "SHOPKEEPER") {
      if (businessTypes.length === 0) {
        showWarning("Select at least one business type");
        return false;
      }
      if (businessTypes.includes("OTHER") && !customBusinessType.trim()) {
        showWarning("Tell us what your custom business type is");
        return false;
      }
    }
    return true;
  }

  async function handleCreate() {
    clear();
    if (!validateStep(1) || !validateStep(2)) return;

    setLoading(true);
    try {
      const created = await apiFetch<{ id: string }>("/api/v1/organizations", {
        method: "POST",
        body: JSON.stringify({
          name,
          businessType,
          ...(businessType === "SHOPKEEPER"
            ? {
                shopSector: businessTypes[0],
                shopBusinessTypes: businessTypes,
                shopCustomBusinessType: businessTypes.includes("OTHER")
                  ? customBusinessType.trim()
                  : null,
                enableStaff,
              }
            : businessType === "SERVICE"
              ? { enableStaff }
              : {}),
          timezone,
          defaultCompletionDays: Number(defaultCompletionDays) || 30,
          settings: {
            modules: moduleToggles,
            ...(isShopVertical(businessType) && brandName.trim()
              ? { shop: { brandName: brandName.trim() } }
              : {}),
          },
        }),
      });
      setActiveOrganizationId(created.id);
      await bootstrap();
      window.location.assign("/dashboard?setup=1");
    } catch (err) {
      applyError(err, "Failed to create organization");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logoutUser();
  }

  const visibleSectors = sectorsForOffering(offeringKind);
  const selected = BUSINESS_TYPE_CONFIG[businessType];

  const reviewModules = useMemo(() => {
    return Object.entries(moduleToggles)
      .filter(([, on]) => on)
      .map(([key]) => moduleLabel(key as ModuleKey, businessType));
  }, [moduleToggles, businessType]);

  if (!initialized) return <PageLoader label="Loading..." />;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <AppearanceMenu />
      </div>
      <div className="mb-6 w-full max-w-lg">
        <AppLogo href="/dashboard" variant="full" brandMode="dual" className="mx-auto w-full" />
      </div>
      <div className="mb-4 flex w-full max-w-lg gap-1">
        {STEP_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "h-1 flex-1 rounded-full",
              i + 1 <= step ? "bg-primary" : "bg-muted"
            )}
            title={label}
          />
        ))}
      </div>
      <Card className="w-full max-w-lg rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isNewOrg ? "Create Organization" : "Welcome to BusinessOS"}
          </CardTitle>
          <CardDescription>
            Step {step} of 5 · {STEP_LABELS[step - 1]}
            {isNewOrg ? ` (${orgCount}/3 used)` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <FormFeedback warning={warning} error={error} />

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization name</Label>
                <Input
                  id="orgName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>I am a…</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {onboardingBusinessTypes().map((type) => {
                    const config = BUSINESS_TYPE_CONFIG[type];
                    const active = businessType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setBusinessType(type)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-colors",
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
                <p className="text-xs text-muted-foreground">{selected.onboardingBlurb}</p>
              </div>
            </>
          )}

          {step === 2 && businessType === "SHOPKEEPER" && (
            <>
              <div className="space-y-2">
                <Label>What do you sell?</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {OFFERING_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setOfferingKind(opt.id);
                        setBusinessTypes(defaultSectorsForOffering(opt.id));
                      }}
                      className={cn(
                        "rounded-xl border p-3 text-left",
                        offeringKind === opt.id && "border-primary bg-primary/5 ring-1 ring-primary"
                      )}
                    >
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {visibleSectors.map((sector) => {
                  const config = SHOP_SECTOR_CONFIG[sector];
                  const active = businessTypes.includes(sector);
                  return (
                    <button
                      key={sector}
                      type="button"
                      onClick={() =>
                        setBusinessTypes((prev) =>
                          prev.includes(sector)
                            ? prev.filter((s) => s !== sector).length > 0
                              ? prev.filter((s) => s !== sector)
                              : prev
                            : [...prev, sector]
                        )
                      }
                      className={cn(
                        "rounded-xl border p-3 text-left",
                        active && "border-primary bg-primary/5 ring-1 ring-primary"
                      )}
                    >
                      <p className="text-sm font-semibold">{config.label}</p>
                    </button>
                  );
                })}
              </div>
              {businessTypes.includes("OTHER") ? (
                <Input
                  value={customBusinessType}
                  onChange={(e) => setCustomBusinessType(e.target.value)}
                  placeholder="Custom business type"
                  className="h-12 rounded-xl"
                />
              ) : null}
            </>
          )}

          {step === 2 && businessType !== "SHOPKEEPER" && (
            <p className="text-sm text-muted-foreground">
              Your {selected.label} workspace uses sensible defaults. Continue to choose features.
            </p>
          )}

          {step === 3 && (
            <>
              {isShopVertical(businessType) && (
                <div className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Allow staff?</p>
                      <p className="text-xs text-muted-foreground">
                        Optional attendance and payroll tracking.
                      </p>
                    </div>
                    <Switch checked={enableStaff} onCheckedChange={setEnableStaff} />
                  </div>
                </div>
              )}
              <OrgModuleToggles
                businessType={businessType}
                primaryShopSector={businessTypes[0] ?? null}
                plan={plan}
                moduleToggles={moduleToggles}
                enableStaff={enableStaff}
                onToggle={(key, next) =>
                  setModuleToggles((prev) => ({ ...prev, [key]: next }))
                }
              />
            </>
          )}

          {step === 4 && (
            <>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              {!isShopVertical(businessType) && (
                <div className="space-y-2">
                  <Label>Default completion days</Label>
                  <Input
                    type="number"
                    min={1}
                    value={defaultCompletionDays}
                    onChange={(e) => setDefaultCompletionDays(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              )}
              {isShopVertical(businessType) && (
                <div className="space-y-2">
                  <Label>Brand name (optional)</Label>
                  <Input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="h-12 rounded-xl"
                    placeholder="Shown on invoices"
                  />
                </div>
              )}
            </>
          )}

          {step === 5 && (
            <div className="space-y-3 rounded-xl border p-4 text-sm">
              <p>
                <span className="font-semibold">Name:</span> {name}
              </p>
              <p>
                <span className="font-semibold">Type:</span> {selected.label}
              </p>
              {businessType === "SHOPKEEPER" && (
                <p>
                  <span className="font-semibold">Sectors:</span>{" "}
                  {businessTypes.map((s) => SHOP_SECTOR_CONFIG[s].label).join(", ")}
                </p>
              )}
              {reviewModules.length > 0 && (
                <p>
                  <span className="font-semibold">Features:</span> {reviewModules.join(", ")}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 rounded-xl"
                onClick={() => goToStep(step - 1)}
              >
                Back
              </Button>
            ) : null}
            {step < 5 ? (
              <Button
                type="button"
                className="h-12 flex-1 rounded-xl"
                onClick={() => {
                  if (validateStep(step)) goToStep(step + 1);
                }}
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                className="h-12 flex-1 rounded-xl"
                disabled={loading}
                onClick={handleCreate}
              >
                {loading ? "Creating..." : "Create organization"}
              </Button>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Log out
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
