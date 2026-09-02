import { auth } from "@/lib/auth";
import { verifyNativeAccessToken } from "@/lib/auth/native-tokens-server";

export async function resolveAuthenticatedUserId(
  authorizationHeader?: string | null
): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;

  const header = authorizationHeader?.trim();
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;
  const verified = await verifyNativeAccessToken(token);
  return verified?.userId ?? null;
}
