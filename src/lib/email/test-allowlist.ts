/**
 * Beta testers who can register without Resend verification.
 * Env TEST_EMAIL_ALLOWLIST adds more (comma-separated). Remove before public launch.
 */
const BUILTIN_BETA_ALLOWLIST = [
  "tanishqbhardwaj03@gmail.com",
  "gs9818860351@gmail.com",
  "tanishqbhardwaj457@gmail.com",
] as const;

/** Comma-separated emails that skip Resend verification (beta testing only). */
export function getTestEmailAllowlist(): Set<string> {
  const set = new Set<string>(BUILTIN_BETA_ALLOWLIST);

  const raw = process.env.TEST_EMAIL_ALLOWLIST?.trim();
  if (raw) {
    for (const email of raw.split(",")) {
      const normalized = email.trim().toLowerCase();
      if (normalized) set.add(normalized);
    }
  }

  return set;
}

export function isTestEmailAllowlisted(email: string): boolean {
  return getTestEmailAllowlist().has(email.trim().toLowerCase());
}
