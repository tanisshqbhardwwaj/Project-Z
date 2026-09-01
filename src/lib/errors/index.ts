import { formatZodIssues } from "@/lib/errors/zod-bridge";
import { ErrorCodes } from "./codes";
import { authMessages } from "./messages/auth";
import { billingMessages, billingMessageByText } from "./messages/billing";
import { genericMessages, genericMessageByText } from "./messages/generic";
import { orgMessages, orgMessageByText } from "./messages/org";
import { projectMessageByText } from "./messages/projects";
import { shopMessages, shopMessageByText } from "./messages/shop";
import { staffMessageByText } from "./messages/staff";

export { ErrorCodes } from "./codes";
export type { ErrorCode } from "./codes";

const codeMessages: Record<string, string> = {
  ...authMessages,
  ...orgMessages,
  ...shopMessages,
  ...billingMessages,
  ...genericMessages,
};

const messageByText: Record<string, string> = {
  ...orgMessageByText,
  ...shopMessageByText,
  ...staffMessageByText,
  ...projectMessageByText,
  ...billingMessageByText,
  ...genericMessageByText,
};

/** Match dynamic server messages (template strings). */
const dynamicPatterns: Array<{ test: RegExp; format: (match: RegExpMatchArray) => string }> = [
  {
    test: /^Inventory item not found for "(.+)"$/,
    format: (m) => `Product not found in inventory: ${m[1]}.`,
  },
  {
    test: /^No product found for barcode (.+)$/,
    format: (m) => `No product found for barcode ${m[1]}.`,
  },
  {
    test: /^Insufficient stock for "(.+)"$/,
    format: (m) => `Not enough stock for ${m[1]}. Reduce quantity or restock.`,
  },
  {
    test: /^Insufficient stock for "(.+)" at source branch$/,
    format: (m) => `Not enough stock for ${m[1]} at the source branch.`,
  },
  {
    test: /^Not enough stock to reverse purchase for "(.+)"$/,
    format: (m) => `Not enough stock to reverse purchase for ${m[1]}.`,
  },
  {
    test: /^Category "(.+)" already exists$/,
    format: (m) => `Category "${m[1]}" already exists.`,
  },
  {
    test: /^You can belong to at most (\d+) organizations$/,
    format: (m) => `You can join up to ${m[1]} businesses. Leave one before joining another.`,
  },
];

const DEFAULT_MESSAGE = genericMessages[ErrorCodes.INTERNAL_ERROR];

export type ResolveUserErrorInput = {
  code?: string;
  message?: string;
  details?: unknown;
};

/**
 * Turn an API error code and/or technical message into user-facing text.
 * Used on the client and when shaping API error responses.
 */
export function resolveUserError(input: ResolveUserErrorInput): string {
  const fromDetails = formatZodIssues(input.details);
  if (fromDetails) return fromDetails;

  const code = input.code?.trim();
  if (code && codeMessages[code]) return codeMessages[code];

  const raw = input.message?.trim();
  if (!raw) return DEFAULT_MESSAGE;

  if (messageByText[raw]) return messageByText[raw];

  for (const pattern of dynamicPatterns) {
    const match = raw.match(pattern.test);
    if (match) return pattern.format(match);
  }

  if (raw.startsWith("Invalid input") || raw.includes("invalid_type")) {
    return orgMessages[ErrorCodes.VALIDATION_ERROR] ?? "Please check your input and try again.";
  }

  // Already plain language (many service throws) — show as-is unless it's clearly internal.
  if (
    !raw.includes("UNIQUE constraint") &&
    !raw.includes("Prisma") &&
    !raw.includes("ECONNREFUSED") &&
    raw.length < 200
  ) {
    return raw;
  }

  return DEFAULT_MESSAGE;
}

/** Whether a thrown Error message is a known business rule (not a crash). */
export function isKnownBusinessError(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  if (messageByText[trimmed]) return true;
  return dynamicPatterns.some((p) => p.test.test(trimmed));
}

/** HTTP status hint for thrown business errors (used by handleApi). */
export function httpStatusForThrownMessage(message: string): number {
  const trimmed = message.trim();
  if (/not found/i.test(trimmed)) return 404;
  if (/not allowed|permission|cannot |can't |only the /i.test(trimmed)) return 403;
  if (/already exists|duplicate|exceeds|invalid|required|must be|select /i.test(trimmed)) {
    return 400;
  }
  return 400;
}
