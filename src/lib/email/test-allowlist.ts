/** Comma-separated emails that skip Resend verification (beta testing only). */
export function getTestEmailAllowlist(): Set<string> {
  const raw = process.env.TEST_EMAIL_ALLOWLIST?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isTestEmailAllowlisted(email: string): boolean {
  return getTestEmailAllowlist().has(email.trim().toLowerCase());
}
