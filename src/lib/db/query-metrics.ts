import "server-only";

import { AsyncLocalStorage } from "async_hooks";

export type QueryMetrics = {
  count: number;
  totalMs: number;
};

const metricsStore = new AsyncLocalStorage<QueryMetrics>();

export function runWithQueryMetrics<T>(fn: () => Promise<T>): Promise<T> {
  return metricsStore.run({ count: 0, totalMs: 0 }, fn);
}

export function getQueryMetrics(): QueryMetrics | undefined {
  return metricsStore.getStore();
}

export function recordQueryDuration(ms: number) {
  const store = metricsStore.getStore();
  if (!store) return;
  store.count += 1;
  store.totalMs += ms;
}

export function queryMetricsHeaders(): Record<string, string> {
  const store = metricsStore.getStore();
  if (!store) return {};
  return {
    "X-Query-Count": String(store.count),
    "X-Db-Ms": String(Math.round(store.totalMs)),
  };
}
