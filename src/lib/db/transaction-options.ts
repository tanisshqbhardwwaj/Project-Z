/** Defaults for prisma.$transaction(async (tx) => …) — Turso round-trips exceed 5s on busy shop writes. */
export const DEFAULT_INTERACTIVE_TX_OPTIONS = {
  maxWait: 10_000,
  timeout: 30_000,
} as const;
