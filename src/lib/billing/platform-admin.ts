import { auth } from "@/lib/auth";
import { ApiError } from "@/lib/api/context";
import { ensureOrgBillingSchema } from "@/lib/db/ensure-org-billing-schema";

function parseAdminEmails(): Set<string> {
  const raw =
    process.env.PLATFORM_ADMIN_EMAILS ??
    process.env.PLATFORM_ADMIN_EMAIL ??
    "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = parseAdminEmails();
  if (admins.size === 0) return false;
  return admins.has(email.trim().toLowerCase());
}

export async function requirePlatformAdmin(): Promise<{
  userId: string;
  userEmail: string;
  userName: string;
}> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }
  if (!isPlatformAdminEmail(session.user.email)) {
    throw new ApiError(404, "NOT_FOUND", "Not found");
  }
  await ensureOrgBillingSchema();
  return {
    userId: session.user.id,
    userEmail: session.user.email,
    userName: session.user.name ?? "",
  };
}
