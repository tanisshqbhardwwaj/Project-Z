import { paiseToRupees } from "@/lib/finance/money";

type AuditLogRow = {
  action: string;
  entityType: string;
  createdAt: string;
  user: { name: string };
  before?: unknown;
  after?: unknown;
};

function formatRupees(paise: unknown): string {
  if (paise == null) return "—";
  const n = typeof paise === "bigint" ? Number(paise) : Number(String(paise));
  if (Number.isNaN(n)) return "—";
  return `₹${paiseToRupees(BigInt(n)).toLocaleString("en-IN")}`;
}

export function formatActivityDescription(log: AuditLogRow): string {
  const who = log.user.name;

  switch (log.action) {
    case "expense.created":
      return `${who} added an expense`;
    case "expense.updated": {
      const before = log.before as { amountPaise?: bigint | string } | null;
      const after = log.after as { amountPaise?: bigint | string } | null;
      if (before?.amountPaise != null && after?.amountPaise != null) {
        return `${who} edited an expense · ${formatRupees(before.amountPaise)} → ${formatRupees(after.amountPaise)}`;
      }
      return `${who} edited an expense`;
    }
    case "project.created":
      return `${who} created this work order`;
    case "project.updated":
      return `${who} updated project details`;
    case "payment.created":
      return `${who} recorded a payment`;
    default:
      return `${who} — ${log.action.replace(/\./g, " ")}`;
  }
}

export function isEditedActivity(log: AuditLogRow): boolean {
  return log.action === "expense.updated" || log.action === "project.updated";
}
