import {
  activatePlanAfterPayment as activatePlanAfterPaymentImpl,
  type PaymentActivationInput,
} from "@/services/billing/billing.service";
import type { BillingPlan } from "@prisma/client";

export type { PaymentActivationInput };

/** Single entry point for manual ops approval or future Razorpay/UPI webhooks. */
export async function activatePlanAfterPayment(
  organizationId: string,
  plan: BillingPlan,
  actorUserId: string | null,
  payment: PaymentActivationInput
) {
  return activatePlanAfterPaymentImpl(organizationId, plan, actorUserId, payment);
}
