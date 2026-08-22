import { createClient } from "@libsql/client/web";
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("\nBuild failed: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required on Vercel.");
  console.error("Create a free database at https://turso.tech and add both vars in Vercel.\n");
  process.exit(1);
}

const client = createClient({ url, authToken });
const migrationsDir = join(process.cwd(), "prisma", "migrations");

function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.replace(/^\s*--[^\n]*\n?/gm, "").trim())
    .filter(Boolean);
}

function errorText(err) {
  const parts = [err?.message, err?.cause?.message, err?.cause?.proto?.message];
  return parts.filter(Boolean).join(" ");
}

function isIgnorableError(err) {
  const m = errorText(err).toLowerCase();
  return (
    m.includes("duplicate column") ||
    m.includes("duplicate index") ||
    m.includes("duplicate key") ||
    m.includes("already exists") ||
    m.includes("duplicate table")
  );
}

async function applyMigrationSql(sql) {
  const statements = splitStatements(sql);
  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (err) {
      if (isIgnorableError(err)) {
        console.warn(`    ⚠ skipped (already applied): ${errorText(err)}`);
        continue;
      }
      throw err;
    }
  }
}

await client.execute(
  `CREATE TABLE IF NOT EXISTS "_turso_migrations" (
    "name" TEXT PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "applied_at" TEXT NOT NULL DEFAULT (datetime('now'))
  )`
);

const applied = new Set();
const existing = await client.execute(`SELECT "name" FROM "_turso_migrations"`);
for (const row of existing.rows) {
  applied.add(row.name);
}

const folders = readdirSync(migrationsDir)
  .filter((name) => !name.startsWith(".") && name !== "migration_lock.toml")
  .sort();

if (applied.size === 0) {
  const schemaCheck = await client.execute(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'User'`
  );
  if (schemaCheck.rows.length > 0) {
    console.log("Existing schema detected — baselining current migrations as applied");
    for (const folder of folders) {
      const migrationPath = join(migrationsDir, folder, "migration.sql");
      const sql = readFileSync(migrationPath, "utf8").trim();
      const checksum = createHash("sha256").update(sql).digest("hex");
      await client.execute({
        sql: `INSERT OR IGNORE INTO "_turso_migrations" ("name", "checksum") VALUES (?, ?)`,
        args: [folder, checksum],
      });
      applied.add(folder);
    }
  }
}

const pending = folders.filter((folder) => !applied.has(folder));

if (pending.length === 0) {
  console.log("✓ Turso database already up to date, no migrations to apply");
} else {
  console.log(`Applying ${pending.length} pending migration(s) to Turso...`);

  for (const folder of pending) {
    const migrationPath = join(migrationsDir, folder, "migration.sql");
    const sql = readFileSync(migrationPath, "utf8").trim();
    if (!sql) continue;

    const checksum = createHash("sha256").update(sql).digest("hex");

    console.log(`  → ${folder}`);
    await applyMigrationSql(sql);
    await client.execute({
      sql: `INSERT INTO "_turso_migrations" ("name", "checksum") VALUES (?, ?)`,
      args: [folder, checksum],
    });
  }

  console.log("✓ Turso migrations applied");
}
