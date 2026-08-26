/**
 * Apply pending Turso migrations, skipping statements that already exist
 * (duplicate column/table/index). Use when _turso_migrations is behind the live schema.
 */
import { createClient } from "@libsql/client/web";
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN required");
  process.exit(1);
}

const client = createClient({ url, authToken });
const migrationsDir = join(process.cwd(), "prisma", "migrations");

await client.execute(
  `CREATE TABLE IF NOT EXISTS "_turso_migrations" (
    "name" TEXT PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "applied_at" TEXT NOT NULL DEFAULT (datetime('now'))
  )`
);

const applied = new Set();
const existing = await client.execute(`SELECT "name" FROM "_turso_migrations"`);
for (const row of existing.rows) applied.add(row.name);

const folders = readdirSync(migrationsDir)
  .filter((name) => !name.startsWith(".") && name !== "migration_lock.toml")
  .sort();

const pending = folders.filter((folder) => !applied.has(folder));

function isIgnorableError(message) {
  const m = String(message).toLowerCase();
  return (
    m.includes("duplicate column") ||
    m.includes("already exists") ||
    m.includes("duplicate key") ||
    m.includes("unique constraint failed")
  );
}

function splitStatements(sql) {
  return sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

for (const folder of pending) {
  const migrationPath = join(migrationsDir, folder, "migration.sql");
  const sql = readFileSync(migrationPath, "utf8").trim();
  if (!sql) continue;

  const checksum = createHash("sha256").update(sql).digest("hex");
  console.log(`→ ${folder}`);

  for (const statement of splitStatements(sql)) {
    try {
      await client.execute(statement);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isIgnorableError(msg)) {
        console.log(`  skip: ${msg.slice(0, 80)}`);
      } else {
        throw e;
      }
    }
  }

  await client.execute({
    sql: `INSERT INTO "_turso_migrations" ("name", "checksum") VALUES (?, ?)`,
    args: [folder, checksum],
  });
  console.log(`  ✓ recorded`);
}

console.log("Done.");
