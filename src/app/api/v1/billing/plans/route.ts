import { handleApi, apiSuccess } from "@/lib/api/context";
<<<<<<< HEAD
import { BILLING_PLANS, PLAN_ORDER, billingContact, formatINRFromPaise } from "@/lib/billing/plans";

export async function GET() {
  return handleApi(async () => {
    const plans = PLAN_ORDER.map((code) => {
      const p = BILLING_PLANS[code];
=======
import { PLAN_ORDER, billingContact, formatINRFromPaise } from "@/lib/billing/plans";
import { getResolvedPlans } from "@/lib/billing/catalog";

export async function GET() {
  return handleApi(async () => {
    const catalog = await getResolvedPlans();
    const plans = PLAN_ORDER.map((code) => {
      const p = catalog[code];
>>>>>>> origin/master
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
<<<<<<< HEAD
=======
        introLabel: p.introLabel ?? null,
        introMonthPaise: p.introMonthPaise ?? null,
        modules: p.modules,
        inventorySkuCap: p.inventorySkuCap,
>>>>>>> origin/master
      };
    });
    return apiSuccess({ plans, billingContact: billingContact() });
  });
}
