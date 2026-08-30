import { z } from "zod";

export const dayKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const appointmentStatusSchema = z.enum([
  "BOOKED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const serviceAppointmentItemSchema = z.object({
  name: z.string().min(1).max(200),
  qty: z.number().positive().max(999),
  priceRupees: z.number().nonnegative(),
  inventoryItemId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  durationMinutes: z.number().int().positive().optional(),
});

export const createServiceAppointmentSchema = z
  .object({
    branchId: z.string().uuid().optional().nullable(),
    customerId: z.string().uuid().optional().nullable(),
    customerName: z.string().max(120).optional().nullable(),
    customerPhone: z.string().max(20).optional().nullable(),
    staffId: z.string().uuid().optional().nullable(),
    items: z.array(serviceAppointmentItemSchema).min(1),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    notes: z.string().max(500).optional().nullable(),
    source: z.string().max(80).optional().nullable(),
    customerPackageId: z.string().uuid().optional().nullable(),
    status: appointmentStatusSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endAt <= data.startAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "End time must be after start time",
      });
    }
    if (!data.customerId && !data.customerName?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["customerName"],
        message: "Customer name or customer ID is required",
      });
    }
  });

export const updateServiceAppointmentSchema = z
  .object({
    branchId: z.string().uuid().optional().nullable(),
    customerId: z.string().uuid().optional().nullable(),
    customerName: z.string().max(120).optional().nullable(),
    customerPhone: z.string().max(20).optional().nullable(),
    staffId: z.string().uuid().optional().nullable(),
    items: z.array(serviceAppointmentItemSchema).min(1).optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    notes: z.string().max(500).optional().nullable(),
    source: z.string().max(80).optional().nullable(),
    customerPackageId: z.string().uuid().optional().nullable(),
    status: appointmentStatusSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startAt && data.endAt && data.endAt <= data.startAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "End time must be after start time",
      });
    }
  });

export const appointmentCalendarQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  branchId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  status: appointmentStatusSchema.optional(),
});

export const completeServiceAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  branchId: z.string().uuid(),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK", "OTHER", "CREDIT"]).optional(),
  paidRupees: z.number().nonnegative().optional(),
  issueInvoice: z.boolean().optional(),
  redeemPackage: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const servicePackageTypeSchema = z.enum([
  "SESSION_PACK",
  "PREPAID_VALUE",
  "MEMBERSHIP",
]);

export const createServicePackageSchema = z
  .object({
    name: z.string().min(2).max(120),
    type: servicePackageTypeSchema,
    priceRupees: z.number().nonnegative(),
    sessionCount: z.number().int().positive().optional().nullable(),
    prepaidValueRupees: z.number().nonnegative().optional().nullable(),
    validityDays: z.number().int().positive().max(3650).optional().nullable(),
    includedServiceIds: z.array(z.string().uuid()).optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "SESSION_PACK" && !data.sessionCount) {
      ctx.addIssue({
        code: "custom",
        path: ["sessionCount"],
        message: "Session count is required for session packs",
      });
    }
    if (data.type === "PREPAID_VALUE" && data.prepaidValueRupees == null) {
      ctx.addIssue({
        code: "custom",
        path: ["prepaidValueRupees"],
        message: "Prepaid value is required for value packs",
      });
    }
  });

export const updateServicePackageSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  type: servicePackageTypeSchema.optional(),
  priceRupees: z.number().nonnegative().optional(),
  sessionCount: z.number().int().positive().optional().nullable(),
  prepaidValueRupees: z.number().nonnegative().optional().nullable(),
  validityDays: z.number().int().positive().max(3650).optional().nullable(),
  includedServiceIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().optional(),
});

export const sellServicePackageSchema = z.object({
  packageId: z.string().uuid(),
  customerId: z.string().uuid(),
  branchId: z.string().uuid(),
  createSale: z.boolean().optional(),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK", "OTHER", "CREDIT"]).optional(),
  paidRupees: z.number().nonnegative().optional(),
});

export const redeemServicePackageSchema = z.object({
  customerPackageId: z.string().uuid(),
  sessionsUsed: z.number().int().positive().optional(),
  valueUsedRupees: z.number().nonnegative().optional(),
});

export const contractBillingCycleSchema = z.enum([
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
]);

export const contractStatusSchema = z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]);

export const createServiceContractSchema = z
  .object({
    customerId: z.string().uuid(),
    name: z.string().min(2).max(160),
    serviceIds: z.array(z.string().uuid()).min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    billingCycle: contractBillingCycleSchema.optional(),
    amountRupees: z.number().nonnegative(),
    visitsIncluded: z.number().int().positive().optional().nullable(),
    nextServiceDate: z.coerce.date().optional().nullable(),
    reminderDaysBefore: z.number().int().min(0).max(90).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate <= data.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be after start date",
      });
    }
  });

export const updateServiceContractSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  serviceIds: z.array(z.string().uuid()).min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  billingCycle: contractBillingCycleSchema.optional(),
  amountRupees: z.number().nonnegative().optional(),
  visitsIncluded: z.number().int().positive().optional().nullable(),
  nextServiceDate: z.coerce.date().optional().nullable(),
  reminderDaysBefore: z.number().int().min(0).max(90).optional(),
  status: contractStatusSchema.optional(),
});

export const generateContractVisitsSchema = z.object({
  contractId: z.string().uuid(),
  fromDate: z.coerce.date().optional(),
  count: z.number().int().positive().max(52).optional(),
});
