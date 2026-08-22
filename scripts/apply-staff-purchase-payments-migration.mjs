import fs from "fs";
import { createPrismaClient } from "./lib/prisma-client.mjs";

const prisma = createPrismaClient();
const sql = fs.readFileSync(
  "prisma/migrations/20260821120000_staff_advances_purchase_payments/migration.sql",
  "utf8"
);
const stmts = sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);

for (const stmt of stmts) {
  try {
    await prisma.$executeRawUnsafe(stmt);
    console.log("OK:", stmt.slice(0, 70).replace(/\n/g, " "));
  } catch (e) {
    console.log("SKIP:", e.message?.slice(0, 100));
  }
}

await prisma.$disconnect();
console.log("Migration apply done.");
