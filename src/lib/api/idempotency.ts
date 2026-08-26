import { prisma } from "@/lib/db/prisma";

/** Returns existing entity id when an idempotency key was already processed. */
export async function findIdempotentEntity(input: {
  organizationId: string;
  scope: string;
  key: string;
}): Promise<string | null> {
  const row = await prisma.syncMutation.findFirst({
    where: {
      organizationId: input.organizationId,
      kind: input.scope,
      id: input.key,
    },
    select: { entityId: true },
  });
  return row?.entityId ?? null;
}
