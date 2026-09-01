import { resolveUserError } from "@/lib/errors";
import { resolveAppFetchUrl, nativeFetchInit } from "@/lib/api/resolve-url";
import { getNativeAccessToken } from "@/platform/common/native-tokens";

type ApiResponse<T> = { data: T; meta?: Record<string, unknown> };
type ApiErrorBody = { error: { code: string; message: string; details?: unknown } };

let activeOrganizationId: string | null = null;
let activeBranchId: string | null = null;

/** Sentinel sent as X-Branch-Id for org-wide aggregation */
export const BRANCH_ALL = "all" as const;

export type ActiveBranchId = string | typeof BRANCH_ALL;

export function setActiveOrganizationId(orgId: string | null) {
  activeOrganizationId = orgId;
}

export function getActiveOrganizationId() {
  return activeOrganizationId;
}

export function setActiveBranchId(branchId: ActiveBranchId | null) {
  activeBranchId = branchId;
  if (typeof window !== "undefined") {
    if (branchId) {
      localStorage.setItem("activeBranchId", branchId);
    } else {
      localStorage.removeItem("activeBranchId");
    }
  }
}

export function getActiveBranchId() {
  if (activeBranchId) return activeBranchId;
  if (typeof window !== "undefined") {
    return localStorage.getItem("activeBranchId");
  }
  return null;
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

async function buildAuthHeaders(headers: Headers): Promise<void> {
  const token = await getNativeAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
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

  const init = nativeFetchInit(options);
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (activeOrganizationId) {
    headers.set("X-Organization-Id", activeOrganizationId);
  }

  const branchId = getActiveBranchId();
  if (branchId) {
    headers.set("X-Branch-Id", branchId);
  }

  await buildAuthHeaders(headers);

  const res = await fetch(resolveAppFetchUrl(path), { ...init, headers });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = json as ApiErrorBody;
    throw new ApiClientError(
      res.status,
      err.error?.code ?? "UNKNOWN",
      resolveUserError({
        code: err.error?.code,
        message: err.error?.message ?? "Request failed",
        details: err.error?.details,
      })
    );
  }

  return (json as ApiResponse<T>).data;
}

export async function apiFetchRaw<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const init = nativeFetchInit(options);
  const headers = new Headers(init.headers);
  if (activeOrganizationId) {
    headers.set("X-Organization-Id", activeOrganizationId);
  }
  const branchId = getActiveBranchId();
  if (branchId) {
    headers.set("X-Branch-Id", branchId);
  }
  await buildAuthHeaders(headers);
  const res = await fetch(resolveAppFetchUrl(path), { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json as ApiErrorBody;
    throw new ApiClientError(
      res.status,
      err.error?.code ?? "UNKNOWN",
      resolveUserError({
        code: err.error?.code,
        message: err.error?.message ?? "Request failed",
        details: err.error?.details,
      })
    );
  }
  return json as T;
}

/** Shared fetch for auth/forms that expect raw JSON envelope. */
export async function appFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const init = nativeFetchInit(options);
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  await buildAuthHeaders(headers);
  return fetch(resolveAppFetchUrl(path), { ...init, headers });
}
