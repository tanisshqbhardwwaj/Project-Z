import type { SyncKind } from "@/lib/sync/kinds";

export type SyncHandlerContext = {
  organizationId: string;
  userId: string;
  clientId: string;
  payload: Record<string, unknown>;
};

export type SyncHandler = (ctx: SyncHandlerContext) => Promise<string | null>;

const registry = new Map<SyncKind, SyncHandler>();

export function registerSyncHandler(kind: SyncKind, handler: SyncHandler) {
  registry.set(kind, handler);
}

export function getSyncHandler(kind: SyncKind): SyncHandler | undefined {
  return registry.get(kind);
}

export function listSyncHandlerKinds(): SyncKind[] {
  return [...registry.keys()];
}
