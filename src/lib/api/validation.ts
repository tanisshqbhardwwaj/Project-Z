import { ZodError, type ZodIssue } from "zod";
import { resolveUserError } from "@/lib/errors";
import {
  validateEmail,
  validateOrganizationName,
  validatePersonName,
  validatePhoneOptional,
  validateSecurePassword,
  validateCustomerNameOptional,
  validateGstinOptional,
  FIELD_LIMITS,
  GSTIN_HINT,
} from "@/lib/validation/fields";

function isApiClientError(err: unknown): err is { code: string; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name: string }).name === "ApiClientError" &&
    "code" in err &&
    "message" in err
  );
}

const FIELD_LABELS: Record<string, string> = {
  amount: "Amount",
  categoryId: "Category",
  projectId: "Work order",
  expenseDate: "Date",
  paymentDate: "Payment date",
  vendorId: "Vendor",
  paidByUserId: "Paid by",
  recipientUserId: "Recipient",
  email: "Email",
  password: "Password",
  name: "Name",
  phone: "Phone",
  token: "Link",
  organizationId: "Organization",
  sourceProjectId: "Work order to merge",
  referenceNumber: "Reference number",
  paymentMethod: "Payment method",
  paymentType: "Payment type",
  role: "Role",
  action: "Action",
  tenderAmount: "Tender amount",
  contractAmount: "Tender amount",
  workOrderNumber: "Work order number",
  clientName: "Client name",
  headOfAccount: "Head of account",
  timeOfCompletion: "Time of completion",
  workOrderDate: "Work order date",
  expectedCompletionDate: "Expected completion date",
  expectedStartDate: "Expected start date",
  description: "Description",
  location: "Location",
  notes: "Notes",
};

export function issueMessage(issue: ZodIssue): string {
  const field = issue.path[issue.path.length - 1]?.toString() ?? "";
  const label = FIELD_LABELS[field] ?? (field ? field.replace(/([A-Z])/g, " $1").toLowerCase() : "this field");

  if (field === "amount" || field === "contractAmount") {
    if (issue.code === "invalid_type") {
      return field === "amount" ? "Please enter an amount" : "Please enter a contract amount";
    }
    if (issue.code === "too_small") {
      return field === "amount" ? "Amount must be greater than zero" : "Contract amount must be greater than zero";
    }
    return field === "amount" ? "Please enter a valid amount" : "Please enter a valid contract amount";
  }

  if (issue.code === "invalid_type") {
    const received = "received" in issue ? issue.received : undefined;
    if (received === "null" || received === "undefined") {
      return `Please fill in ${label}`;
    }
    return `Please enter a valid ${label}`;
  }

  if (issue.code === "too_small") {
    if (issue.origin === "string") {
      return `${label} is too short`;
    }
    return `${label} must be greater than zero`;
  }

  if (issue.code === "invalid_format" && field === "email") {
    return "Please enter a valid email address";
  }

  if (issue.message && !issue.message.startsWith("Invalid input")) {
    return issue.message;
  }

  return `Please check ${label}`;
}

export function formatZodError(error: ZodError): string {
  const first = error.issues[0];
  return first ? issueMessage(first) : "Please check your input and try again.";
}

function formatZodIssues(issues: unknown): string | null {
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const first = issues[0];
  if (first && typeof first === "object" && "path" in first) {
    return issueMessage(first as ZodIssue);
  }
  return null;
}

export function humanizeErrorMessage(message: string, details?: unknown): string {
  return resolveUserError({ message, details });
}

export type ApiErrorPayload = {
  code?: string;
  message?: string;
  details?: unknown;
};

export function parseApiErrorResponse(
  data: { error?: ApiErrorPayload },
  fallback = "Request failed"
): { kind: "validation" | "error"; message: string } {
  const code = data.error?.code ?? "";
  const message = humanizeErrorMessage(data.error?.message ?? fallback, data.error?.details);
  return {
    kind: code === "VALIDATION_ERROR" ? "validation" : "error",
    message,
  };
}

export type FormFeedbackHandlers = {
  setWarning: (message: string) => void;
  setError: (message: string) => void;
  clear?: () => void;
};

export function applyFormError(
  err: unknown,
  handlers: FormFeedbackHandlers,
  fallback = "Something went wrong. Please try again."
) {
  handlers.clear?.();

  if (isApiClientError(err)) {
    if (err.code === "VALIDATION_ERROR") {
      handlers.setWarning(err.message);
      return;
    }
    handlers.setError(err.message || fallback);
    return;
  }

  handlers.setError(err instanceof Error ? err.message : fallback);
}

export function applyApiResponseError(
  data: { error?: ApiErrorPayload },
  handlers: FormFeedbackHandlers,
  fallback = "Request failed"
) {
  handlers.clear?.();
  const parsed = parseApiErrorResponse(data, fallback);
  if (parsed.kind === "validation") {
    handlers.setWarning(parsed.message);
  } else {
    handlers.setError(parsed.message);
  }
}

export function requireSelect(value: string, label: string): string | null {
  if (!value) return `Please select ${label.toLowerCase()}`;
  return null;
}

export function requireField(value: string, label: string): string | null {
  if (!value.trim()) return `Please fill in ${label.toLowerCase()}`;
  return null;
}

export function requireEmail(value: string): string | null {
  return validateEmail(value);
}

export function requireSecurePassword(value: string): string | null {
  return validateSecurePassword(value);
}

export function requirePersonName(value: string, label = "name"): string | null {
  return validatePersonName(value, label.charAt(0).toUpperCase() + label.slice(1));
}

export function requireOrganizationName(value: string): string | null {
  return validateOrganizationName(value);
}

export function requirePhoneOptional(value: string): string | null {
  return validatePhoneOptional(value);
}

export function requireCustomerNameOptional(value: string): string | null {
  return validateCustomerNameOptional(value);
}

export function requireGstinOptional(value: string): string | null {
  return validateGstinOptional(value);
}

export { FIELD_LIMITS, PASSWORD_HINT, GSTIN_HINT } from "@/lib/validation/fields";
export { PASSWORD_HINT as passwordHint } from "@/lib/validation/fields";

export function parseAmountInput(
  value: string,
  label = "amount"
): { ok: true; amount: number } | { ok: false; message: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, message: label === "amount" ? "Please enter an amount" : `Please enter a ${label}` };
  }
  const amount = Number(trimmed);
  if (!Number.isFinite(amount)) {
    return { ok: false, message: label === "amount" ? "Please enter a valid amount" : `Please enter a valid ${label}` };
  }
  if (amount <= 0) {
    return {
      ok: false,
      message: label === "amount" ? "Amount must be greater than zero" : `${label[0].toUpperCase()}${label.slice(1)} must be greater than zero`,
    };
  }
  return { ok: true, amount };
}

export function firstValidationIssue(
  checks: Array<string | null | undefined>
): string | null {
  for (const check of checks) {
    if (check) return check;
  }
  return null;
}
