export type SqlValue = string | number | null;

export type SqlRunner = {
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T = Record<string, unknown>>(sql: string, params?: SqlValue[]): Promise<T[]>;
};
