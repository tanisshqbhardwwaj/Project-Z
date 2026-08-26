import { create } from "zustand";

export type SyncConnection = "online" | "offline" | "syncing" | "error";

type SyncUiState = {
  connection: SyncConnection;
  pending: number;
  lastSyncAt: string | null;
  lastError: string | null;
  storageUsedLabel: string | null;
  storageQuotaLabel: string | null;
  storagePercent: number;
  cloudEnabled: boolean;
  quotaFull: boolean;
  setConnection: (connection: SyncConnection) => void;
  setPending: (pending: number) => void;
  setLastSync: (iso: string | null) => void;
  setError: (message: string | null) => void;
  setStorage: (input: {
    usedLabel?: string | null;
    quotaLabel?: string | null;
    percent?: number;
    cloudEnabled?: boolean;
    quotaFull?: boolean;
  }) => void;
};

export const useSyncStore = create<SyncUiState>((set) => ({
  connection:
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline",
  pending: 0,
  lastSyncAt: null,
  lastError: null,
  storageUsedLabel: null,
  storageQuotaLabel: null,
  storagePercent: 0,
  cloudEnabled: true,
  quotaFull: false,
  setConnection: (connection) => set({ connection }),
  setPending: (pending) => set({ pending }),
  setLastSync: (iso) => set({ lastSyncAt: iso }),
  setError: (message) => set({ lastError: message, connection: message ? "error" : "online" }),
  setStorage: (input) =>
    set((s) => ({
      storageUsedLabel: input.usedLabel ?? s.storageUsedLabel,
      storageQuotaLabel: input.quotaLabel ?? s.storageQuotaLabel,
      storagePercent: input.percent ?? s.storagePercent,
      cloudEnabled: input.cloudEnabled ?? s.cloudEnabled,
      quotaFull: input.quotaFull ?? s.quotaFull,
    })),
}));
