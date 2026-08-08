import { createClient } from "@libsql/client/web";
import { readdirSync, readFileSync } from "node:fs";
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

const folders = readdirSync(migrationsDir)
  .filter((name) => !name.startsWith(".") && name !== "migration_lock.toml")
  .sort();

console.log(`Applying ${folders.length} migration(s) to Turso...`);

for (const folder of folders) {
  const migrationPath = join(migrationsDir, folder, "migration.sql");
  const sql = readFileSync(migrationPath, "utf8").trim();
  if (!sql) continue;

  console.log(`  → ${folder}`);
  await client.executeMultiple(sql);
}

console.log("✓ Turso migrations applied");
