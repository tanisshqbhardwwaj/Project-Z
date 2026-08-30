import type { Prisma } from "@prisma/client";
import { fiscalYearLabel } from "@/lib/shop/bill-number";

type Tx = Prisma.TransactionClient;

function toAlnumUpper(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Short project code for bill numbers, e.g. nickname "Site-A" → "SITE". */
export function deriveProjectCode(input: {
  nickname?: string | null;
  name?: string | null;
  projectId: string;
}): string {
  const fromNickname = toAlnumUpper(input.nickname);
  if (fromNickname.length >= 2) return fromNickname.slice(0, 6);

  const words = (input.name ?? "")
    .trim()
    .split(/\s+/)
    .map((w) => toAlnumUpper(w))
    .filter(Boolean);
  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join("")
      .slice(0, 6);
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 6);
  }

  return input.projectId.replace(/-/g, "").slice(0, 4).toUpperCase() || "PRJ";
}

/**
 * Per-project GST-safe bill number: CODE/FY/SEQ, e.g. "SITE/26-27/0001".
 * Series is independent from the org shop counter.
 */
export function formatProjectBillNumber(input: {
  projectCode: string;
  fiscalYear: string;
  sequence: number;
}): string {
  const code = (toAlnumUpper(input.projectCode) || "PRJ").slice(0, 6);
  const seq = String(Math.max(1, Math.floor(input.sequence))).padStart(4, "0");
  return `${code}/${input.fiscalYear}/${seq}`;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2002"
  );
}

async function incrementProjectBillCounter(
  tx: Tx,
  projectId: string,
  fiscalYear: string
): Promise<number> {
  const where = { projectId_fiscalYear: { projectId, fiscalYear } } as const;
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await tx.projectBillCounter.findUnique({ where });
    if (existing) {
      const updated = await tx.projectBillCounter.update({
        where: { id: existing.id },
        data: { seq: { increment: 1 } },
      });
      return updated.seq;
    }
    try {
      const created = await tx.projectBillCounter.create({
        data: { projectId, fiscalYear, seq: 1 },
      });
      return created.seq;
    } catch (err) {
      if (isUniqueViolation(err)) continue;
      throw err;
    }
  }
  const updated = await tx.projectBillCounter.update({
    where,
    data: { seq: { increment: 1 } },
  });
  return updated.seq;
}

export async function nextProjectBillNumber(
  tx: Tx,
  projectId: string
): Promise<string> {
  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, nickname: true },
  });
  if (!project) throw new Error("Project not found");

  const projectCode = deriveProjectCode(project);
  const fiscalYear = fiscalYearLabel();
  const seq = await incrementProjectBillCounter(tx, projectId, fiscalYear);

  return formatProjectBillNumber({ projectCode, fiscalYear, sequence: seq });
}
