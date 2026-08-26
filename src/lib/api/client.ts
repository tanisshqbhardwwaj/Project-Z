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
  const method = (options.method ?? "GET").toUpperCase();
  if (typeof window !== "undefined") {
    try {
      const { shouldHandleLocally, handleLocalApi } = await import("@/lib/sync/local-api");
      if (shouldHandleLocally(path, method)) {
        try {
          return await handleLocalApi<T>(path, options);
        } catch (localErr) {
          if (typeof navigator !== "undefined" && !navigator.onLine) throw localErr;
          /* online: fall through to cloud if local intercept is write-only duplicate risk */
          if (method === "GET") {
            /* ignore and try network */
          } else {
            const { isLocalFirstWrite } = await import("@/lib/sync/local-api");
            if (isLocalFirstWrite(path, method)) {
              return await handleLocalApi<T>(path, options);
            }
          }
        }
      }
    } catch {
      /* local db unavailable — use network */
    }
  }

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
