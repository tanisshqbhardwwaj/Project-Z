import { z } from "zod";

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

export const createStaffSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().max(20).optional().nullable(),
  roleTitle: z.string().min(1).max(80),
  wageRupees: z.number().nonnegative().optional().nullable(),
  wagePeriod: z.enum(["DAILY", "MONTHLY"]).optional().nullable(),
  overtimeRateRupees: z.number().nonnegative().optional().nullable(),
  joinedAt: dayKeySchema.optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const updateStaffSchema = createStaffSchema.partial().extend({
  status: z.enum(["ACTIVE", "LEFT"]).optional(),
  userId: z.string().uuid().nullable().optional(),
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

export const orgModulesSchema = z.record(z.string(), z.boolean());

export const orgSettingsPatchSchema = z.object({
  weeklyOffDays: z.array(z.number().int().min(0).max(6)).optional(),
  unmarkedDayPolicy: z.enum(["PRESENT", "ABSENT", "EXCLUDED"]).optional(),
  modules: orgModulesSchema.optional(),
});
