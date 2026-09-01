import { prisma } from "@/lib/db/prisma";
import { MAX_BETA_TEST_EMAILS } from "@/lib/email/beta-test-constants";

export { MAX_BETA_TEST_EMAILS };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function envAllowlist(): Set<string> {
  const set = new Set<string>();
  const raw = process.env.TEST_EMAIL_ALLOWLIST?.trim();
  if (raw) {
    for (const e of raw.split(",")) {
      const n = normalizeEmail(e);
      if (n) set.add(n);
    }
  }
  return set;
}

export function isStaticTestEmailAllowlisted(email: string): boolean {
  return envAllowlist().has(normalizeEmail(email));
}

/** Beta bypass is off in production unless explicitly enabled for a closed beta. */
export function isBetaEmailBypassEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ALLOW_BETA_EMAIL_BYPASS === "true";
}

export async function isTestEmailAllowlisted(email: string): Promise<boolean> {
  if (!isBetaEmailBypassEnabled()) return false;
  const normalized = normalizeEmail(email);
  if (isStaticTestEmailAllowlisted(normalized)) return true;

  const row = await prisma.betaTestEmail.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  return Boolean(row);
}

export async function listBetaTestEmails() {
  return prisma.betaTestEmail.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      addedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function addBetaTestEmail(input: { email: string; addedById: string }) {
  const normalized = normalizeEmail(input.email);
  if (!normalized) throw new Error("Email is required");

  const existing = await prisma.betaTestEmail.findUnique({ where: { email: normalized } });
  if (existing) return existing;

  const count = await prisma.betaTestEmail.count();
  if (count >= MAX_BETA_TEST_EMAILS) {
    throw new Error(
      `Beta tester limit reached (max ${MAX_BETA_TEST_EMAILS}). Remove one to add another.`
    );
  }

  return prisma.betaTestEmail.create({
    data: {
      email: normalized,
      addedById: input.addedById,
    },
    include: {
      addedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function removeBetaTestEmail(email: string) {
  const normalized = normalizeEmail(email);
  await prisma.betaTestEmail.deleteMany({ where: { email: normalized } });
}
