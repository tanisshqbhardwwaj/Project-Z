/**
 * Apply staff attendance barcode schema to Turso without rebuilding StaffAttendance.
 * The full migration fails when legacy rows have NULL overtimeHours.
 */
import "dotenv/config";
import { createClient } from "@libsql/client/web";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN required");
  process.exit(1);
}

const client = createClient({ url, authToken });

function ignorable(msg) {
  const m = String(msg).toLowerCase();
  return (
    m.includes("duplicate column") ||
    m.includes("already exists") ||
    m.includes("duplicate index")
  );
}

async function run(sql, label) {
  try {
    await client.execute(sql);
    console.log(`✓ ${label}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (ignorable(msg)) console.log(`⚠ skip ${label}: ${msg.slice(0, 100)}`);
    else throw err;
  }
}

const statements = [
  [
    `ALTER TABLE "StaffMember" ADD COLUMN "attendanceBarcode" TEXT`,
    "StaffMember.attendanceBarcode",
  ],
  [
    `ALTER TABLE "StaffMember" ADD COLUMN "attendanceBarcodeSetAt" DATETIME`,
    "StaffMember.attendanceBarcodeSetAt",
  ],
  [
    `CREATE UNIQUE INDEX IF NOT EXISTS "StaffMember_organizationId_attendanceBarcode_key" ON "StaffMember"("organizationId", "attendanceBarcode")`,
    "StaffMember barcode unique index",
  ],
  [
    `CREATE INDEX IF NOT EXISTS "StaffMember_organizationId_attendanceBarcode_idx" ON "StaffMember"("organizationId", "attendanceBarcode")`,
    "StaffMember barcode index",
  ],
  [
    `ALTER TABLE "StaffAttendance" ADD COLUMN "deviceId" TEXT`,
    "StaffAttendance.deviceId",
  ],
  [
    `CREATE TABLE IF NOT EXISTS "StaffAttendanceEvent" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "staffId" TEXT NOT NULL,
      "attendanceId" TEXT,
      "deviceId" TEXT,
      "type" TEXT NOT NULL,
      "at" DATETIME NOT NULL,
      "source" TEXT NOT NULL DEFAULT 'BARCODE',
      "createdById" TEXT NOT NULL,
      "previousJson" JSON,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StaffAttendanceEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "StaffAttendanceEvent_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "StaffAttendanceEvent_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "StaffAttendance" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "StaffAttendanceEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    "StaffAttendanceEvent table",
  ],
  [
    `CREATE INDEX IF NOT EXISTS "StaffAttendanceEvent_organizationId_staffId_at_idx" ON "StaffAttendanceEvent"("organizationId", "staffId", "at")`,
    "StaffAttendanceEvent staff index",
  ],
  [
    `CREATE INDEX IF NOT EXISTS "StaffAttendanceEvent_organizationId_at_idx" ON "StaffAttendanceEvent"("organizationId", "at")`,
    "StaffAttendanceEvent org index",
  ],
];

for (const [sql, label] of statements) {
  await run(sql, label);
}

await client.execute(
  `CREATE TABLE IF NOT EXISTS "_turso_migrations" (
    "name" TEXT PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "applied_at" TEXT NOT NULL DEFAULT (datetime('now'))
  )`
);
await client.execute({
  sql: `INSERT OR IGNORE INTO "_turso_migrations" ("name", "checksum") VALUES (?, ?)`,
  args: [
    "20260902120000_staff_attendance_barcode",
    "staff-attendance-barcode-targeted",
  ],
});

const cols = await client.execute(`PRAGMA table_info("StaffMember")`);
const names = cols.rows.map((r) => r.name);
console.log(
  "Turso StaffMember has attendanceBarcode:",
  names.includes("attendanceBarcode")
);
