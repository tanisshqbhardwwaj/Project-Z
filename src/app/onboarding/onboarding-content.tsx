"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, setActiveOrganizationId } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { logoutUser } from "@/lib/auth/logout-client";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";
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
  type ShopSector,
} from "@/lib/org/shop-sector";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export default function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewOrg = searchParams.get("new") === "1";
  const { bootstrap, status, initialized, logout } = useAuthStore();
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("CONTRACTOR");
  const [businessTypes, setBusinessTypes] = useState<ShopSector[]>(["CLOTHING"]);
  const [customBusinessType, setCustomBusinessType] = useState("");
  const [enableStaff, setEnableStaff] = useState(false);
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const [loading, setLoading] = useState(false);
  const [orgCount, setOrgCount] = useState(0);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clear();

    const validationMessage = requireField(name, "organization name");
    if (validationMessage) {
      showWarning(validationMessage);
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

    setLoading(true);

    try {
      // The org is created with the primary type, then the full multi-select is
      // saved so category choices cover every type from the first screen.
      const created = await apiFetch<{ id: string }>("/api/v1/organizations", {
        method: "POST",
        body: JSON.stringify({
          name,
          businessType,
          ...(businessType === "SHOPKEEPER"
            ? { shopSector: businessTypes[0], enableStaff }
            : {}),
        }),
      });
      if (businessType === "SHOPKEEPER" && businessTypes.length > 0) {
        setActiveOrganizationId(created.id);
        await apiFetch("/api/v1/organizations", {
          method: "PATCH",
          body: JSON.stringify({
            shopBusinessTypes: businessTypes,
            shopCustomBusinessType: businessTypes.includes("OTHER")
              ? customBusinessType.trim()
              : null,
          }),
        }).catch(() => {
          // Non-fatal: the org already exists with its primary type and the
          // owner can finish the selection in Manage Organization.
        });
      }
      await bootstrap();
      router.push(
        businessType === "SHOPKEEPER" && enableStaff ? "/staff" : "/dashboard"
      );
      router.refresh();
    } catch (err) {
      applyError(err, "Failed to create organization");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
<<<<<<< HEAD
    await logoutUser();
=======
    await fetch("/api/v1/auth/logout", { method: "POST" });
    logout();
    window.location.href = "/login";
>>>>>>> origin/master
  }

  if (!initialized) return <PageLoader label="Loading..." />;

  const selected = BUSINESS_TYPE_CONFIG[businessType];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 w-full max-w-lg">
        <AppLogo href="/dashboard" variant="full" className="mx-auto w-full" />
      </div>
      <Card className="w-full max-w-lg rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isNewOrg ? "Create Organization" : "Welcome to Project Z"}
          </CardTitle>
          <CardDescription>
            {isNewOrg
              ? `Add another organization (${orgCount}/3 used)`
              : "Tell us what you do — we’ll tailor labels and defaults"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormFeedback warning={warning} error={error} />
            {error?.toLowerCase().includes("session") && (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl"
                onClick={handleLogout}
              >
                Log out and start fresh
              </Button>
            )}
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
                {BUSINESS_TYPES.map((type) => {
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

            {businessType === "SHOPKEEPER" && (
              <div className="space-y-2">
                <Label>My business is</Label>
                <p className="text-xs text-muted-foreground">
                  Pick every type you sell. You can change this later.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SHOP_SECTORS.map((sector) => {
                    const config = SHOP_SECTOR_CONFIG[sector];
                    const active = businessTypes.includes(sector);
                    return (
                      <button
                        key={sector}
                        type="button"
                        aria-pressed={active}
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
                          "rounded-xl border p-3 text-left transition-colors",
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:bg-accent/50"
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">
                            {config.label}
                          </span>
                          {active ? (
                            <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                              {businessTypes[0] === sector ? "Primary" : "✓"}
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
                    <Label htmlFor="onboarding-custom-type">
                      What is your business?
                    </Label>
                    <Input
                      id="onboarding-custom-type"
                      value={customBusinessType}
                      onChange={(e) => setCustomBusinessType(e.target.value)}
                      className="h-12 rounded-xl"
                      placeholder="e.g. Mobile Repair & Accessories"
                      maxLength={120}
                    />
                  </div>
                ) : null}
              </div>
            )}

            {businessType === "SHOPKEEPER" && (
              <div className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Allow staff?</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Optional. Track attendance and pay salary from days worked.
                    </p>
                  </div>
                  <Switch
                    checked={enableStaff}
                    onCheckedChange={setEnableStaff}
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="h-12 w-full rounded-xl" size="lg" disabled={loading}>
              {loading ? "Creating..." : "Create Organization"}
            </Button>
          </form>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Log out
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
