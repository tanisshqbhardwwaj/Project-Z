import { handleApi, apiSuccess } from "@/lib/api/context";
import { BILLING_PLANS, PLAN_ORDER, billingContact, formatINRFromPaise } from "@/lib/billing/plans";

export async function GET() {
  return handleApi(async () => {
    const plans = PLAN_ORDER.map((code) => {
      const p = BILLING_PLANS[code];
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
      };
    });
    return apiSuccess({ plans, billingContact: billingContact() });
  });
}
