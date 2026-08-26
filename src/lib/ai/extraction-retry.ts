/** Quota / 429 must not burn Inngest retries; other errors must throw so retries run. */

export class ExtractionQuotaError extends Error {
  readonly retry = false as const;

  constructor(message: string) {
    super(message);
    this.name = "ExtractionQuotaError";
  }
}

export function isAiQuotaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    message.includes("429") ||
    lower.includes("quota") ||
    lower.includes("resource has been exhausted") ||
    lower.includes("rate limit")
  );
}
