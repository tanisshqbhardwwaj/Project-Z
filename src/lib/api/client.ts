import { humanizeErrorMessage } from "@/lib/api/validation";

type ApiResponse<T> = { data: T; meta?: Record<string, unknown> };
type ApiErrorBody = { error: { code: string; message: string; details?: unknown } };

let activeOrganizationId: string | null = null;

export function setActiveOrganizationId(orgId: string | null) {
  activeOrganizationId = orgId;
}

export function getActiveOrganizationId() {
  return activeOrganizationId;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (activeOrganizationId) {
    headers.set("X-Organization-Id", activeOrganizationId);
  }

  const res = await fetch(path, { ...options, headers });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = json as ApiErrorBody;
    throw new ApiClientError(
      res.status,
      err.error?.code ?? "UNKNOWN",
      humanizeErrorMessage(err.error?.message ?? "Request failed", err.error?.details)
    );
  }

  return (json as ApiResponse<T>).data;
}

export async function apiFetchRaw<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (activeOrganizationId) {
    headers.set("X-Organization-Id", activeOrganizationId);
  }
  const res = await fetch(path, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json as ApiErrorBody;
    throw new ApiClientError(
      res.status,
      err.error?.code ?? "UNKNOWN",
      humanizeErrorMessage(err.error?.message ?? "Request failed", err.error?.details)
    );
  }
  return json as T;
}
