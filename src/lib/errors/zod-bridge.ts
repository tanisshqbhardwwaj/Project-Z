import type { ZodIssue } from "zod";

/** Shared Zod issue formatting (avoids circular import with validation.ts). */
export function issueMessageFromZod(issue: ZodIssue): string {
  const field = issue.path[issue.path.length - 1]?.toString() ?? "";
  const label = field
    ? field.replace(/([A-Z])/g, " $1").toLowerCase()
    : "this field";

  if (issue.code === "invalid_type") {
    const received = "received" in issue ? issue.received : undefined;
    if (received === "null" || received === "undefined") {
      return `Please fill in ${label}`;
    }
    return `Please enter a valid ${label}`;
  }

  if (issue.code === "too_small") {
    if (issue.origin === "string") return `${label} is too short`;
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

export function formatZodIssues(details: unknown): string | null {
  if (!Array.isArray(details) || details.length === 0) return null;
  const first = details[0];
  if (first && typeof first === "object" && "path" in first) {
    return issueMessageFromZod(first as ZodIssue);
  }
  return null;
}
