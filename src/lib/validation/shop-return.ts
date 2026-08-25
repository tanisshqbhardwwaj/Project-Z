import { z } from "zod";

export const PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "BANK",
  "CARD",
  "CHEQUE",
  "CREDIT",
  "OTHER",
] as const;

export const RETURN_REASONS = [
  "DAMAGED",
  "DEFECTIVE",
  "WRONG_PRODUCT",
  "CUSTOMER_CHANGED_MIND",
  "OTHER",
] as const;

export const returnLineSchema = z.object({
  lineKey: z.string().min(1),
  returnQty: z.number().positive().max(100000),
});

export const exchangeItemSchema = z.object({
  inventoryItemId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  qty: z.number().positive().max(100000),
  priceRupees: z.number().min(0).max(100000000),
});

export const processReturnSchema = z.object({
  shopSaleId: z.string().uuid(),
  type: z.enum(["RETURN", "EXCHANGE"]).optional(),
  reason: z.enum(RETURN_REASONS),
  notes: z.string().max(1000).optional().nullable(),
  refundMethod: z.enum(PAYMENT_METHODS).default("CASH"),
  lines: z.array(returnLineSchema).min(1, "Select at least one item to return"),
  exchangeItems: z.array(exchangeItemSchema).optional(),
  staffId: z.string().uuid().optional().nullable(),
  staffName: z.string().max(120).optional().nullable(),
});

export type ProcessReturnBody = z.infer<typeof processReturnSchema>;
