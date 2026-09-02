-- Staff attendance barcode + event log (Turso/SQLite idempotent)
ALTER TABLE "StaffMember" ADD COLUMN "attendanceBarcode" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN "attendanceBarcodeSetAt" DATETIME;

CREATE UNIQUE INDEX IF NOT EXISTS "StaffMember_organizationId_attendanceBarcode_key" ON "StaffMember"("organizationId", "attendanceBarcode");
CREATE INDEX IF NOT EXISTS "StaffMember_organizationId_attendanceBarcode_idx" ON "StaffMember"("organizationId", "attendanceBarcode");

ALTER TABLE "StaffAttendance" ADD COLUMN "deviceId" TEXT;

CREATE TABLE IF NOT EXISTS "StaffAttendanceEvent" (
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
);

CREATE INDEX IF NOT EXISTS "StaffAttendanceEvent_organizationId_staffId_at_idx" ON "StaffAttendanceEvent"("organizationId", "staffId", "at");
CREATE INDEX IF NOT EXISTS "StaffAttendanceEvent_organizationId_at_idx" ON "StaffAttendanceEvent"("organizationId", "at");
