import type { BillingPlan } from "@prisma/client";
import type { ModuleKey } from "@/lib/org/modules";
import { MODULE_REGISTRY } from "@/lib/org/modules";
import { prisma } from "@/lib/db/prisma";
import {
  BILLING_PLANS,
  PLAN_ORDER,
  type PlanDefinition,
} from "@/lib/billing/plans";

export const BILLING_CATALOG_KEY = "billing.catalog";

const ALL_MODULE_KEYS = MODULE_REGISTRY.map((m) => m.key) as ModuleKey[];

export const PLAN_MODULE_OPTIONS: Array<{ key: ModuleKey; label: string }> =
  MODULE_REGISTRY.filter((m) =>
    m.availableFor.includes("SHOPKEEPER")
  ).map((m) => ({
    key: m.key,
    label: m.label.SHOPKEEPER,
  }));

type StoredCatalog = Partial<Record<BillingPlan, Partial<PlanDefinition>>>;

let catalogCache: { at: number; plans: Record<BillingPlan, PlanDefinition> } | null =
  null;
const CACHE_MS = 8_000;

function clonePlan(plan: PlanDefinition): PlanDefinition {
  return {
    ...plan,
    features: [...plan.features],
    modules: [...plan.modules],
    comingSoon: plan.comingSoon ? [...plan.comingSoon] : undefined,
  };
}

function isModuleKey(value: string): value is ModuleKey {
  return ALL_MODULE_KEYS.includes(value as ModuleKey);
}

function mergePlan(code: BillingPlan, override?: Partial<PlanDefinition>): PlanDefinition {
  const base = clonePlan(BILLING_PLANS[code]);
  if (!override) return base;

  const modules = Array.isArray(override.modules)
    ? override.modules.filter((m): m is ModuleKey => typeof m === "string" && isModuleKey(m))
    : base.modules;

  const features = Array.isArray(override.features)
    ? override.features.map((f) => String(f).trim()).filter(Boolean)
    : base.features;

  const comingSoon = Array.isArray(override.comingSoon)
    ? override.comingSoon.map((f) => String(f).trim()).filter(Boolean)
    : base.comingSoon;

  const monthlyPaise =
    typeof override.monthlyPaise === "number" && Number.isFinite(override.monthlyPaise)
      ? Math.max(0, Math.round(override.monthlyPaise))
      : base.monthlyPaise;

  const storageBytes =
    typeof override.storageBytes === "number" && Number.isFinite(override.storageBytes)
      ? Math.max(0, Math.round(override.storageBytes))
      : base.storageBytes;

  const inventorySkuCap =
    override.inventorySkuCap === null
      ? null
      : typeof override.inventorySkuCap === "number" && Number.isFinite(override.inventorySkuCap)
        ? Math.max(1, Math.round(override.inventorySkuCap))
        : base.inventorySkuCap;

  const introMonthPaise = Object.prototype.hasOwnProperty.call(override, "introMonthPaise")
    ? typeof override.introMonthPaise === "number" && override.introMonthPaise > 0
      ? Math.round(override.introMonthPaise)
      : undefined
    : base.introMonthPaise;

  const introLabel = Object.prototype.hasOwnProperty.call(override, "introLabel")
    ? typeof override.introLabel === "string" && override.introLabel.trim()
      ? override.introLabel.trim()
      : undefined
    : introMonthPaise
      ? base.introLabel
      : base.introLabel;

  return {
    ...base,
    code,
    name: typeof override.name === "string" && override.name.trim() ? override.name.trim() : base.name,
    tagline:
      typeof override.tagline === "string" && override.tagline.trim()
        ? override.tagline.trim()
        : base.tagline,
    storageLabel:
      typeof override.storageLabel === "string" && override.storageLabel.trim()
        ? override.storageLabel.trim()
        : base.storageLabel,
    monthlyPaise,
    storageBytes,
    mostPopular: override.mostPopular ?? base.mostPopular,
    features,
    modules: modules.length ? modules : base.modules,
    inventorySkuCap,
    comingSoon: comingSoon?.length ? comingSoon : undefined,
    introMonthPaise,
    introLabel,
  };
}

function defaultsCatalog(): Record<BillingPlan, PlanDefinition> {
  return {
    BASIC: clonePlan(BILLING_PLANS.BASIC),
    BUSINESS: clonePlan(BILLING_PLANS.BUSINESS),
    PROFESSIONAL: clonePlan(BILLING_PLANS.PROFESSIONAL),
    BUSINESS_PRO: clonePlan(BILLING_PLANS.BUSINESS_PRO),
  };
}

function mergeCatalog(stored: StoredCatalog | null): Record<BillingPlan, PlanDefinition> {
  const merged = defaultsCatalog();
  if (!stored) return merged;
  for (const code of PLAN_ORDER) {
    merged[code] = mergePlan(code, stored[code]);
  }
  const popular = PLAN_ORDER.filter((code) => merged[code].mostPopular);
  if (popular.length > 1) {
    for (const code of popular.slice(1)) merged[code].mostPopular = false;
  }
  return merged;
}

function parseStoredValue(value: unknown): StoredCatalog | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as StoredCatalog;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") return value as StoredCatalog;
  return null;
}

async function readStoredCatalog(): Promise<StoredCatalog | null> {
  const row = await prisma.platformSetting.findUnique({
    where: { key: BILLING_CATALOG_KEY },
    select: { value: true },
  });
  return parseStoredValue(row?.value);
}

async function writeStoredCatalog(toStore: StoredCatalog, updatedById?: string | null) {
  await prisma.platformSetting.upsert({
    where: { key: BILLING_CATALOG_KEY },
    create: {
      key: BILLING_CATALOG_KEY,
      value: toStore,
      updatedById: updatedById ?? null,
    },
    update: {
      value: toStore,
      updatedById: updatedById ?? null,
    },
  });
}

export function invalidatePlanCatalogCache() {
  catalogCache = null;
}

export async function getResolvedPlans(): Promise<Record<BillingPlan, PlanDefinition>> {
  const now = Date.now();
  if (catalogCache && now - catalogCache.at < CACHE_MS) {
    return catalogCache.plans;
  }

  try {
    const stored = await readStoredCatalog();
    const plans = mergeCatalog(stored);
    catalogCache = { at: now, plans };
    return plans;
  } catch {
    const plans = defaultsCatalog();
    catalogCache = { at: now, plans };
    return plans;
  }
}

export async function getResolvedPlanDefinition(plan: BillingPlan): Promise<PlanDefinition> {
  const plans = await getResolvedPlans();
  return plans[plan];
}

export async function savePlanCatalog(
  overrides: StoredCatalog,
  updatedById?: string | null
): Promise<Record<BillingPlan, PlanDefinition>> {
  let existing: StoredCatalog = {};
  try {
    existing = (await readStoredCatalog()) ?? {};
  } catch {
    existing = {};
  }
  const plans = mergeCatalog({ ...existing, ...overrides });
  const toStore: StoredCatalog = {};
  for (const code of PLAN_ORDER) {
    const p = plans[code];
    toStore[code] = {
      code: p.code,
      name: p.name,
      monthlyPaise: p.monthlyPaise,
      storageBytes: p.storageBytes,
      storageLabel: p.storageLabel,
      tagline: p.tagline,
      mostPopular: p.mostPopular ?? false,
      features: p.features,
      modules: p.modules,
      inventorySkuCap: p.inventorySkuCap,
      comingSoon: p.comingSoon ?? [],
      introMonthPaise: p.introMonthPaise,
      introLabel: p.introLabel,
    };
  }

  await writeStoredCatalog(toStore, updatedById);
  catalogCache = { at: Date.now(), plans };
  return plans;
}

export async function resetPlanCatalog() {
  await prisma.platformSetting.deleteMany({
    where: { key: BILLING_CATALOG_KEY },
  });
  invalidatePlanCatalogCache();
  return defaultsCatalog();
}
