import { z } from "zod";
import {
  emailFieldSchema,
  personNameSchema,
  phoneOptionalSchema,
} from "@/lib/validation/fields";

export const dayKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const yearMonthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const attendanceStatusSchema = z.enum([
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "PAID_LEAVE",
]);

export const upsertAttendanceSchema = z.object({
  staffId: z.string().min(1),
  date: dayKeySchema,
  status: attendanceStatusSchema,
  overtimeHours: z.number().min(0).max(24).optional(),
  notes: z.string().max(300).optional().nullable(),
});

export const bulkAttendanceSchema = z.object({
  date: dayKeySchema,
  status: attendanceStatusSchema,
  staffIds: z.array(z.string().min(1)).optional(),
});

/** Suggested roles. `roleTitle` stays free text so shops can invent their own. */
export const STAFF_ROLE_KEYS = [
  "OWNER",
  "MANAGER",
  "SALES_STAFF",
  "CASHIER",
  "ACCOUNTANT",
  "INVENTORY_MANAGER",
  "DELIVERY_STAFF",
  "WAITER",
  "CUSTOM",
] as const;

export const staffCommissionTypeSchema = z.enum([
  "NONE",
  "PERCENT",
  "FIXED_PER_SALE",
  "FIXED_PER_ITEM",
  "FIXED_MONTHLY",
]);

export const createStaffSchema = z
  .object({
    name: personNameSchema,
    phone: phoneOptionalSchema,
    email: emailFieldSchema.optional().nullable().or(z.literal("")),
    roleKey: z.enum(STAFF_ROLE_KEYS).optional().nullable(),
    roleTitle: z.string().min(1).max(80),
    cashierCode: z
      .string()
      .max(10)
      .regex(/^[A-Za-z0-9]*$/, "Use letters and numbers only")
      .optional()
      .nullable(),
    wageRupees: z.number().nonnegative().optional().nullable(),
    wagePeriod: z.enum(["DAILY", "MONTHLY"]).optional().nullable(),
    paymentFrequency: z
      .enum(["DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY"])
      .optional()
      .nullable(),
    overtimeRateRupees: z.number().nonnegative().optional().nullable(),
    commissionType: staffCommissionTypeSchema.optional(),
    commissionPercent: z.number().min(0).max(100).optional().nullable(),
    commissionAmountRupees: z.number().min(0).optional().nullable(),
    joinedAt: dayKeySchema.optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    access: z
      .object({
        canBill: z.boolean().optional(),
        canProcessReturns: z.boolean().optional(),
        canViewOwnAttendance: z.boolean().optional(),
        canViewOwnSales: z.boolean().optional(),
        canManageInventory: z.boolean().optional(),
        canViewAllAttendance: z.boolean().optional(),
        canViewAllSales: z.boolean().optional(),
        canViewOwnDeliveries: z.boolean().optional(),
        canUpdateDeliveryStatus: z.boolean().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.commissionType === "PERCENT" && !data.commissionPercent) {
      ctx.addIssue({
        code: "custom",
        path: ["commissionPercent"],
        message: "Enter a commission percentage",
      });
    }
    if (
      (data.commissionType === "FIXED_PER_SALE" ||
        data.commissionType === "FIXED_PER_ITEM" ||
        data.commissionType === "FIXED_MONTHLY") &&
      !data.commissionAmountRupees
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["commissionAmountRupees"],
        message: "Enter a commission amount",
      });
    }
  });

export const updateStaffSchema = z.object({
  name: personNameSchema.optional(),
  phone: phoneOptionalSchema,
  email: emailFieldSchema.optional().nullable().or(z.literal("")),
  roleKey: z.enum(STAFF_ROLE_KEYS).optional().nullable(),
  roleTitle: z.string().min(1).max(80).optional(),
  cashierCode: z
    .string()
    .max(10)
    .regex(/^[A-Za-z0-9]*$/, "Use letters and numbers only")
    .optional()
    .nullable(),
  wageRupees: z.number().nonnegative().optional().nullable(),
  wagePeriod: z.enum(["DAILY", "MONTHLY"]).optional().nullable(),
  paymentFrequency: z
    .enum(["DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY"])
    .optional()
    .nullable(),
  overtimeRateRupees: z.number().nonnegative().optional().nullable(),
  commissionType: staffCommissionTypeSchema.optional(),
  commissionPercent: z.number().min(0).max(100).optional().nullable(),
  commissionAmountRupees: z.number().min(0).optional().nullable(),
  joinedAt: dayKeySchema.optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  status: z.enum(["ACTIVE", "LEFT"]).optional(),
  userId: z.string().uuid().nullable().optional(),
  access: z
    .object({
      canBill: z.boolean().optional(),
      canProcessReturns: z.boolean().optional(),
      canViewOwnAttendance: z.boolean().optional(),
      canViewOwnSales: z.boolean().optional(),
      canManageInventory: z.boolean().optional(),
      canViewAllAttendance: z.boolean().optional(),
      canViewAllSales: z.boolean().optional(),
      canViewOwnDeliveries: z.boolean().optional(),
      canUpdateDeliveryStatus: z.boolean().optional(),
    })
    .optional(),
});

export const generatePayrollSchema = yearMonthQuerySchema.extend({
  staffId: z.string().optional(),
});

export const updatePayrollSchema = z.object({
  payrollId: z.string().min(1),
  adjustmentRupees: z.number().min(0).optional().nullable(),
  finalAmountRupees: z.number().nonnegative().optional().nullable(),
  status: z.enum(["DRAFT", "FINALIZED", "PAID"]).optional(),
  notes: z.string().max(500).optional().nullable(),
  lines: z
    .array(
      z.object({
        type: z.enum(["EARNING", "DEDUCTION"]),
        label: z.string().min(1).max(80),
        amountRupees: z.number().nonnegative(),
      })
    )
    .optional(),
});

export const createStaffAdvanceSchema = z.object({
  staffId: z.string().min(1),
  amountRupees: z.number().positive(),
  notes: z.string().max(500).optional().nullable(),
  givenDate: dayKeySchema.optional(),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK", "OTHER"]).optional(),
});

export const orgModulesSchema = z.record(z.string(), z.boolean());

export const orgSettingsPatchSchema = z.object({
  weeklyOffDays: z.array(z.number().int().min(0).max(6)).optional(),
  unmarkedDayPolicy: z.enum(["PRESENT", "ABSENT", "EXCLUDED"]).optional(),
  modules: orgModulesSchema.optional(),
});
