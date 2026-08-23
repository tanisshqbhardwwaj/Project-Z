import type { SqlDriverAdapter, SqlResultSet, Transaction } from "@prisma/driver-adapter-utils";

/** Prisma ColumnTypeEnum.Int64 — Int64 values must be strings, not JS numbers. */
const INT64 = 1;

const BIGINT_COLUMN = /(?:Paise|Bytes|byteSize)$/i;

function asInt64String(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value).toString();
  }
  if (typeof value === "string" && /^-?\d+\.0+$/.test(value)) {
    return value.slice(0, value.indexOf("."));
  }
  return value;
}

function coerceResult(result: SqlResultSet): SqlResultSet {
  const columnTypes = result.columnTypes.slice();
  const rows = result.rows.map((row) =>
    row.map((value, i) => {
      const name = result.columnNames[i] ?? "";
      if (columnTypes[i] === INT64 || BIGINT_COLUMN.test(name)) {
        columnTypes[i] = INT64;
        return asInt64String(value);
      }
      return value;
    })
  );
  return { ...result, columnTypes, rows };
}

function wrapQueryable<T extends { queryRaw: SqlDriverAdapter["queryRaw"] }>(target: T): T {
  const original = target.queryRaw.bind(target);
  target.queryRaw = async (query) => coerceResult(await original(query));
  return target;
}

export function wrapLibSqlAdapter(adapter: SqlDriverAdapter): SqlDriverAdapter {
  wrapQueryable(adapter);
  const startTransaction = adapter.startTransaction.bind(adapter);
  adapter.startTransaction = async (isolationLevel) => {
    const tx = await startTransaction(isolationLevel);
    return wrapQueryable(tx) as Transaction;
  };
  return adapter;
}
