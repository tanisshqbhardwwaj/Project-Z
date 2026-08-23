import { handleApi, apiSuccess } from "@/lib/api/context";
import { PLAN_ORDER, billingContact, formatINRFromPaise } from "@/lib/billing/plans";
import { getResolvedPlans } from "@/lib/billing/catalog";

export async function GET() {
  return handleApi(async () => {
    const catalog = await getResolvedPlans();
    const plans = PLAN_ORDER.map((code) => {
      const p = catalog[code];
      return {
        code: p.code,
        name: p.name,
        monthlyPaise: p.monthlyPaise,
        monthlyLabel: formatINRFromPaise(p.monthlyPaise),
        storageBytes: p.storageBytes,
        storageLabel: p.storageLabel,
        tagline: p.tagline,
        mostPopular: p.mostPopular ?? false,
        features: p.features,
        comingSoon: p.comingSoon ?? [],
        introLabel: p.introLabel ?? null,
        introMonthPaise: p.introMonthPaise ?? null,
        modules: p.modules,
        inventorySkuCap: p.inventorySkuCap,
      };
    });
    return apiSuccess({ plans, billingContact: billingContact() });
  });
}
