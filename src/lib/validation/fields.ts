import { z } from "zod";

/** Shared input limits — keep client hints and server schemas in sync. */
export const FIELD_LIMITS = {
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  EMAIL_MAX: 160,
  PHONE_MAX: 20,
  PHONE_MIN_DIGITS: 10,
  PHONE_MAX_DIGITS: 15,
  PERSON_NAME_MIN: 2,
  PERSON_NAME_MAX: 100,
  ORG_NAME_MIN: 2,
  ORG_NAME_MAX: 100,
  ROLE_TITLE_MAX: 80,
  CUSTOM_BUSINESS_TYPE_MAX: 120,
  CUSTOMER_NAME_MAX: 100,
  GSTIN_LENGTH: 15,
} as const;

/** Indian GSTIN — 15 chars: 2-digit state + PAN + entity + Z + checksum. */
export const GSTIN_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const GSTIN_HINT =
  "15 characters, e.g. 27AABCU9603R1ZM (2-digit state + PAN + entity code)";

export const PASSWORD_HINT =
  "8–128 characters with at least one uppercase letter, one lowercase letter, and one number";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function validateSecurePassword(value: string): string | null {
  if (!value) return "Please enter your password";
  if (value.length < FIELD_LIMITS.PASSWORD_MIN) {
    return `Password must be at least ${FIELD_LIMITS.PASSWORD_MIN} characters`;
  }
  if (value.length > FIELD_LIMITS.PASSWORD_MAX) {
    return `Password must be at most ${FIELD_LIMITS.PASSWORD_MAX} characters`;
  }
  if (/\s/.test(value)) {
    return "Password cannot contain spaces";
  }
  if (!/[a-z]/.test(value)) {
    return "Password must include a lowercase letter";
  }
  if (!/[A-Z]/.test(value)) {
    return "Password must include an uppercase letter";
  }
  if (!/\d/.test(value)) {
    return "Password must include a number";
  }
  return null;
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Please enter your email address";
  if (trimmed.length > FIELD_LIMITS.EMAIL_MAX) {
    return `Email must be at most ${FIELD_LIMITS.EMAIL_MAX} characters`;
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return "Please enter a valid email address";
  }
  return null;
}

export function validatePhoneOptional(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > FIELD_LIMITS.PHONE_MAX) {
    return `Phone must be at most ${FIELD_LIMITS.PHONE_MAX} characters`;
  }
  const digits = normalizePhoneDigits(trimmed);
  if (
    digits.length < FIELD_LIMITS.PHONE_MIN_DIGITS ||
    digits.length > FIELD_LIMITS.PHONE_MAX_DIGITS
  ) {
    return "Enter a valid 10-digit mobile number";
  }
  const local =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
  if (local.length === 10 && !/^[6-9]/.test(local)) {
    return "Indian mobile numbers start with 6, 7, 8, or 9";
  }
  return null;
}

export function validatePersonName(value: string, label = "Name"): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `Please fill in ${label.toLowerCase()}`;
  if (trimmed.length < FIELD_LIMITS.PERSON_NAME_MIN) {
    return `${label} must be at least ${FIELD_LIMITS.PERSON_NAME_MIN} characters`;
  }
  if (trimmed.length > FIELD_LIMITS.PERSON_NAME_MAX) {
    return `${label} must be at most ${FIELD_LIMITS.PERSON_NAME_MAX} characters`;
  }
  return null;
}

export function validateOrganizationName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Please fill in organization name";
  if (trimmed.length < FIELD_LIMITS.ORG_NAME_MIN) {
    return `Organization name must be at least ${FIELD_LIMITS.ORG_NAME_MIN} characters`;
  }
  if (trimmed.length > FIELD_LIMITS.ORG_NAME_MAX) {
    return `Organization name must be at most ${FIELD_LIMITS.ORG_NAME_MAX} characters`;
  }
  return null;
}

/** Walk-in bills may omit the name; validate only when provided. */
export function validateCustomerNameOptional(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > FIELD_LIMITS.CUSTOMER_NAME_MAX) {
    return `Customer name must be at most ${FIELD_LIMITS.CUSTOMER_NAME_MAX} characters`;
  }
  return null;
}

export function normalizeGstin(value: string): string {
  return value.trim().toUpperCase().replace(/\s/g, "");
}

export function validateGstinOptional(value: string): string | null {
  const normalized = normalizeGstin(value);
  if (!normalized) return null;
  if (normalized.length !== FIELD_LIMITS.GSTIN_LENGTH) {
    return `GSTIN must be exactly ${FIELD_LIMITS.GSTIN_LENGTH} characters`;
  }
  if (!GSTIN_PATTERN.test(normalized)) {
    return `Enter a valid GSTIN (${GSTIN_HINT})`;
  }
  return null;
}

function passwordRefine(value: string, ctx: z.RefinementCtx) {
  const message = validateSecurePassword(value);
  if (message) {
    ctx.addIssue({ code: "custom", message });
  }
}

function phoneRefine(value: string | null | undefined, ctx: z.RefinementCtx) {
  if (value == null || value === "") return;
  const message = validatePhoneOptional(value);
  if (message) {
    ctx.addIssue({ code: "custom", message });
  }
}

export const securePasswordSchema = z
  .string()
  .superRefine((value, ctx) => passwordRefine(value, ctx));

export const emailFieldSchema = z
  .string()
  .trim()
  .max(FIELD_LIMITS.EMAIL_MAX, `Email must be at most ${FIELD_LIMITS.EMAIL_MAX} characters`)
  .email("Please enter a valid email address")
  .transform((value) => value.toLowerCase());

export const phoneOptionalSchema = z
  .string()
  .trim()
  .max(FIELD_LIMITS.PHONE_MAX)
  .optional()
  .nullable()
  .superRefine((value, ctx) => phoneRefine(value, ctx))
  .transform((value) => (value ? value : null));

export const personNameSchema = z
  .string()
  .trim()
  .min(FIELD_LIMITS.PERSON_NAME_MIN, `Name must be at least ${FIELD_LIMITS.PERSON_NAME_MIN} characters`)
  .max(FIELD_LIMITS.PERSON_NAME_MAX, `Name must be at most ${FIELD_LIMITS.PERSON_NAME_MAX} characters`);

export const organizationNameSchema = z
  .string()
  .trim()
  .min(FIELD_LIMITS.ORG_NAME_MIN, `Organization name must be at least ${FIELD_LIMITS.ORG_NAME_MIN} characters`)
  .max(FIELD_LIMITS.ORG_NAME_MAX, `Organization name must be at most ${FIELD_LIMITS.ORG_NAME_MAX} characters`);

export const shopCustomerNameSchema = z
  .string()
  .trim()
  .max(
    FIELD_LIMITS.CUSTOMER_NAME_MAX,
    `Customer name must be at most ${FIELD_LIMITS.CUSTOMER_NAME_MAX} characters`
  )
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

export const shopCustomerGstinSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    return normalizeGstin(value);
  })
  .superRefine((value, ctx) => {
    if (value == null) return;
    const message = validateGstinOptional(value);
    if (message) {
      ctx.addIssue({ code: "custom", message });
    }
  });

export const registerSchema = z.object({
  email: emailFieldSchema,
  password: securePasswordSchema,
  name: personNameSchema,
  phone: phoneOptionalSchema,
  inviteToken: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{8,128}$/)
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: securePasswordSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: securePasswordSchema,
});

export const updateProfileSchema = z.object({
  name: personNameSchema,
  phone: phoneOptionalSchema,
});
