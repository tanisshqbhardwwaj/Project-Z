import { randomUUID } from "crypto";

const CORRELATION_HEADER = "x-correlation-id";

export function readCorrelationId(request: Request): string {
  return (
    request.headers.get(CORRELATION_HEADER)?.trim() ||
    request.headers.get("x-request-id")?.trim() ||
    randomUUID()
  );
}

export function correlationHeaders(id: string): Record<string, string> {
  return { [CORRELATION_HEADER]: id };
}

export function attachCorrelationId<T extends Record<string, unknown>>(
  payload: T,
  correlationId: string
): T & { correlationId: string } {
  return { ...payload, correlationId };
}
