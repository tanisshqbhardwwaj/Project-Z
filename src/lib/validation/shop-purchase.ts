import { z } from "zod";

export const recordPurchasePaymentSchema = z.object({
  amountRupees: z.number().positive(),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK", "OTHER", "CREDIT"]).optional(),
  notes: z.string().max(500).optional().nullable(),
});
