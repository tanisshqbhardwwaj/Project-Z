"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { PlanCards } from "@/components/billing/plan-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { cn } from "@/lib/utils";

const GB = 1024 * 1024 * 1024;

type ModuleOption = { key: string; label: string };

type PlanEditor = {
  code: string;
  name: string;
  tagline: string;
  monthlyRupees: string;
  introRupees: string;
  introLabel: string;
  storageGb: string;
  storageLabel: string;
  inventorySkuCap: string;
  mostPopular: boolean;
  featuresText: string;
  comingSoonText: string;
  modules: string[];
};

type CatalogResponse = {
  plans: Array<{
    code: string;
    name: string;
    tagline: string;
    monthlyRupees: number;
    introRupees: number | null;
    introLabel: string | null;
    storageGb: number;
    storageLabel: string;
    inventorySkuCap: number | null;
    mostPopular: boolean;
    features: string[];
    comingSoon: string[];
    modules: string[];
    monthlyLabel: string;
  }>;
  modules: ModuleOption[];
};

function toEditor(p: CatalogResponse["plans"][number]): PlanEditor {
  return {
    code: p.code,
    name: p.name,
    tagline: p.tagline,
    monthlyRupees: String(p.monthlyRupees),
    introRupees: p.introRupees != null ? String(p.introRupees) : "",
    introLabel: p.introLabel ?? "",
    storageGb: String(p.storageGb),
    storageLabel: p.storageLabel,
    inventorySkuCap: p.inventorySkuCap != null ? String(p.inventorySkuCap) : "",
    mostPopular: p.mostPopular,
    featuresText: p.features.join("\n"),
    comingSoonText: (p.comingSoon ?? []).join("\n"),
    modules: [...p.modules],
  };
}

function lines(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function OpsPlansPage() {
  const [editors, setEditors] = useState<PlanEditor[]>([]);
  const [moduleOptions, setModuleOptions] = useState<ModuleOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<CatalogResponse>("/api/v1/ops/plans");
    setEditors(res.plans.map(toEditor));
    setModuleOptions(res.modules);
  }, []);

  useEffect(() => {
    load().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    });
  }, [load]);

  function update(code: string, patch: Partial<PlanEditor>) {
    setEditors((prev) =>
      prev.map((p) => {
        if (p.code !== code) {
          if (patch.mostPopular === true) return { ...p, mostPopular: false };
          return p;
        }
        const next = { ...p, ...patch };
        if (patch.storageGb != null && !Number.isNaN(Number(patch.storageGb))) {
          const gb = Number(patch.storageGb);
          if (gb > 0 && (!p.storageLabel || p.storageLabel.endsWith(" GB") || p.storageLabel.endsWith("GB"))) {
            next.storageLabel = Number.isInteger(gb) ? `${gb} GB` : `${gb} GB`;
          }
        }
        return next;
      })
    );
    setNotice(null);
  }

  function toggleModule(code: string, key: string) {
    setEditors((prev) =>
      prev.map((p) => {
        if (p.code !== code) return p;
        const has = p.modules.includes(key);
        return {
          ...p,
          modules: has ? p.modules.filter((m) => m !== key) : [...p.modules, key],
        };
      })
    );
    setNotice(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      for (const p of editors) {
        if (!p.modules.length) {
          throw new Error(`${p.name} needs at least one module`);
        }
        if (!lines(p.featuresText).length) {
          throw new Error(`${p.name} needs at least one feature line`);
        }
      }
      const res = await apiFetch<CatalogResponse>("/api/v1/ops/plans", {
        method: "PATCH",
        body: JSON.stringify({
          plans: editors.map((p) => {
            const monthlyRupees = Number(p.monthlyRupees);
            const storageGb = Number(p.storageGb);
            const introRupees = p.introRupees.trim() ? Number(p.introRupees) : null;
            const sku = p.inventorySkuCap.trim() ? Number(p.inventorySkuCap) : null;
            if (!Number.isFinite(monthlyRupees) || monthlyRupees < 0) {
              throw new Error(`Invalid monthly price on ${p.name}`);
            }
            if (!Number.isFinite(storageGb) || storageGb < 0) {
              throw new Error(`Invalid storage GB on ${p.name}`);
            }
            return {
              code: p.code,
              name: p.name.trim(),
              tagline: p.tagline.trim(),
              monthlyPaise: Math.round(monthlyRupees * 100),
              storageBytes: Math.round(storageGb * GB),
              storageLabel: p.storageLabel.trim() || `${storageGb} GB`,
              mostPopular: p.mostPopular,
              features: lines(p.featuresText),
              comingSoon: lines(p.comingSoonText),
              modules: p.modules,
              inventorySkuCap: sku != null && Number.isFinite(sku) ? Math.round(sku) : null,
              introMonthPaise:
                introRupees != null && Number.isFinite(introRupees) && introRupees > 0
                  ? Math.round(introRupees * 100)
                  : null,
              introLabel: p.introLabel.trim() || null,
            };
          }),
        }),
      });
      setEditors(res.plans.map(toEditor));
      setNotice("Catalog saved. Customer billing pages will show the new prices and features.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save catalog");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm("Reset all four plans to the built-in catalog?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<CatalogResponse>("/api/v1/ops/plans", {
        method: "PATCH",
        body: JSON.stringify({ reset: true }),
      });
      setEditors(res.plans.map(toEditor));
      setNotice("Restored built-in plan defaults.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset catalog");
    } finally {
      setSaving(false);
    }
  }

  if (error && !editors.length) {
    return <p className="text-destructive">{error}</p>;
  }

  if (!editors.length) return <PageLoader label="Loading catalog…" />;

  const preview = editors.map((p) => ({
    code: p.code,
    name: p.name || p.code,
    monthlyLabel: `₹${Number(p.monthlyRupees || 0).toLocaleString("en-IN")}`,
    storageLabel: p.storageLabel || `${p.storageGb} GB`,
    tagline: p.tagline,
    mostPopular: p.mostPopular,
    features: lines(p.featuresText),
    comingSoon: lines(p.comingSoonText),
    introLabel: p.introLabel || null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Pricing catalog</h2>
          <p className="text-sm text-muted-foreground">
            Edit prices, features, storage, and modules. Shops see this on Billing. Existing
            customers keep their current quota until you activate a plan again.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" disabled={saving} onClick={reset}>
            Reset defaults
          </Button>
          <Button className="rounded-xl" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save catalog"}
          </Button>
        </div>
      </div>

      <FormFeedback error={error ?? undefined} />
      {notice ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {editors.map((plan) => (
          <Card key={plan.code} className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>{plan.code}</span>
                <label className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={plan.mostPopular}
                    onChange={(e) => update(plan.code, { mostPopular: e.target.checked })}
                  />
                  Most popular
                </label>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Display name">
                  <Input
                    value={plan.name}
                    onChange={(e) => update(plan.code, { name: e.target.value })}
                  />
                </Field>
                <Field label="Monthly ₹">
                  <Input
                    type="number"
                    min={0}
                    value={plan.monthlyRupees}
                    onChange={(e) => update(plan.code, { monthlyRupees: e.target.value })}
                  />
                </Field>
                <Field label="Intro ₹ (1st month, optional)">
                  <Input
                    type="number"
                    min={0}
                    value={plan.introRupees}
                    onChange={(e) => update(plan.code, { introRupees: e.target.value })}
                  />
                </Field>
                <Field label="Intro label">
                  <Input
                    value={plan.introLabel}
                    placeholder="₹999 for the 1st month only"
                    onChange={(e) => update(plan.code, { introLabel: e.target.value })}
                  />
                </Field>
                <Field label="Cloud storage (GB)">
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={plan.storageGb}
                    onChange={(e) => update(plan.code, { storageGb: e.target.value })}
                  />
                </Field>
                <Field label="Storage label">
                  <Input
                    value={plan.storageLabel}
                    onChange={(e) => update(plan.code, { storageLabel: e.target.value })}
                  />
                </Field>
                <Field label="SKU cap (blank = unlimited)">
                  <Input
                    type="number"
                    min={1}
                    value={plan.inventorySkuCap}
                    onChange={(e) => update(plan.code, { inventorySkuCap: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Tagline">
                <Input
                  value={plan.tagline}
                  onChange={(e) => update(plan.code, { tagline: e.target.value })}
                />
              </Field>
              <Field label="Features (one per line)">
                <textarea
                  className="min-h-36 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                  value={plan.featuresText}
                  onChange={(e) => update(plan.code, { featuresText: e.target.value })}
                />
              </Field>
              <Field label="Coming soon (one per line)">
                <textarea
                  className="min-h-20 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm"
                  value={plan.comingSoonText}
                  onChange={(e) => update(plan.code, { comingSoonText: e.target.value })}
                />
              </Field>
              <div>
                <Label className="mb-2 block">Modules included</Label>
                <div className="flex flex-wrap gap-2">
                  {moduleOptions.map((m) => {
                    const on = plan.modules.includes(m.key);
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => toggleModule(plan.code, m.key)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Customer preview</h3>
        <PlanCards plans={preview} readOnly />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
