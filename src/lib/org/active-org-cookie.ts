import { cookies } from "next/headers";
import { ACTIVE_ORG_COOKIE } from "@/lib/org/constants";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function readActiveOrgCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(ACTIVE_ORG_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function writeActiveOrgCookie(organizationId: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, organizationId, cookieOptions());
}

export async function clearActiveOrgCookie(): Promise<void> {
  try {
    const store = await cookies();
    store.delete(ACTIVE_ORG_COOKIE);
  } catch {
    /* not in a request */
  }
}
