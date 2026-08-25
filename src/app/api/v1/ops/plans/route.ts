import { z } from "zod";
import { handleApi, apiSuccess } from "@/lib/api/context";
import { requirePlatformAdmin } from "@/lib/billing/platform-admin";
import { PLAN_ORDER, formatINRFromPaise, type PlanDefinition } from "@/lib/billing/plans";
import {
  getResolvedPlans,
  savePlanCatalog,
  resetPlanCatalog,
  PLAN_MODULE_OPTIONS,
} from "@/lib/billing/catalog";
import type { BillingPlan } from "@prisma/client";
import type { ModuleKey } from "@/lib/org/modules";

const PLAN_CODES = ["BASIC", "BUSINESS", "PROFESSIONAL", "BUSINESS_PRO"] as const;

const planSchema = z.object({
  code: z.enum(PLAN_CODES),
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(240),
  monthlyPaise: z.number().int().min(0).max(100_000_000),
  storageBytes: z.number().int().min(0),
  storageLabel: z.string().trim().min(1).max(80),
  mostPopular: z.boolean().optional(),
  features: z.array(z.string().trim().min(1).max(200)).max(40),
  comingSoon: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  modules: z.array(z.string()).min(1).max(20),
  inventorySkuCap: z.number().int().positive().max(1_000_000).nullable(),
  introMonthPaise: z.number().int().positive().max(100_000_000).nullable().optional(),
  introLabel: z.string().trim().max(120).nullable().optional(),
});

const patchSchema = z.object({
  reset: z.boolean().optional(),
  plans: z.array(planSchema).min(1).max(4).optional(),
});

function toPublic(p: PlanDefinition) {
  return {
    code: p.code,
    name: p.name,
    tagline: p.tagline,
    monthlyPaise: p.monthlyPaise,
    monthlyRupees: p.monthlyPaise / 100,
    monthlyLabel: formatINRFromPaise(p.monthlyPaise),
    storageBytes: p.storageBytes,
    storageGb: Math.round((p.storageBytes / (1024 * 1024 * 1024)) * 100) / 100,
    storageLabel: p.storageLabel,
    mostPopular: p.mostPopular ?? false,
    features: p.features,
    comingSoon: p.comingSoon ?? [],
    modules: p.modules,
    inventorySkuCap: p.inventorySkuCap,
    introMonthPaise: p.introMonthPaise ?? null,
    introRupees: p.introMonthPaise ? p.introMonthPaise / 100 : null,
    introLabel: p.introLabel ?? null,
  };
}

export async function GET() {
  return handleApi(async () => {
    await requirePlatformAdmin();
    const catalog = await getResolvedPlans();
    return apiSuccess({
      plans: PLAN_ORDER.map((code) => toPublic(catalog[code])),
      modules: PLAN_MODULE_OPTIONS,
    });
  });
}

export async function PATCH(request: Request) {
  return handleApi(async () => {
    const admin = await requirePlatformAdmin();
    const body = patchSchema.parse(await request.json());

    if (body.reset) {
      const catalog = await resetPlanCatalog();
      return apiSuccess({
        plans: PLAN_ORDER.map((code) => toPublic(catalog[code])),
        modules: PLAN_MODULE_OPTIONS,
      });
    }

    if (!body.plans?.length) {
      const catalog = await getResolvedPlans();
      return apiSuccess({
        plans: PLAN_ORDER.map((code) => toPublic(catalog[code])),
        modules: PLAN_MODULE_OPTIONS,
      });
    }

    const allowedModules = new Set(PLAN_MODULE_OPTIONS.map((m) => m.key));
    const overrides: Partial<Record<BillingPlan, Partial<PlanDefinition>>> = {};

    for (const plan of body.plans) {
      const modules = plan.modules.filter((m): m is ModuleKey =>
        allowedModules.has(m as ModuleKey)
      );
      overrides[plan.code] = {
        name: plan.name,
        tagline: plan.tagline,
        monthlyPaise: plan.monthlyPaise,
        storageBytes: plan.storageBytes,
        storageLabel: plan.storageLabel,
        mostPopular: plan.mostPopular,
        features: plan.features,
        comingSoon: plan.comingSoon ?? [],
        modules: modules.length ? modules : ["shop_sales"],
        inventorySkuCap: plan.inventorySkuCap,
        introMonthPaise: plan.introMonthPaise ?? undefined,
        introLabel: plan.introLabel ?? undefined,
      };
    }

    const catalog = await savePlanCatalog(overrides, admin.userId);
    return apiSuccess({
      plans: PLAN_ORDER.map((code) => toPublic(catalog[code])),
      modules: PLAN_MODULE_OPTIONS,
    });
  });
}
