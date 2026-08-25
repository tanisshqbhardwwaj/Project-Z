export const OUTBOX_MAX_ATTEMPTS = 8;

export type OutboxAttemptStatus = "PENDING" | "SYNCING" | "DONE" | "ERROR" | "DEAD";

export function nextOutboxFailure(attempts: number): {
  status: "ERROR" | "DEAD";
  attempts: number;
} {
  const next = (Number.isFinite(attempts) ? attempts : 0) + 1;
  if (next >= OUTBOX_MAX_ATTEMPTS) {
    return { status: "DEAD", attempts: next };
  }
  return { status: "ERROR", attempts: next };
}

export function isRetryableOutboxStatus(
  status: OutboxAttemptStatus,
  attempts = 0
): boolean {
  if (status === "DEAD" || status === "DONE" || status === "SYNCING") return false;
  if (status !== "PENDING" && status !== "ERROR") return false;
  return attempts < OUTBOX_MAX_ATTEMPTS;
}
