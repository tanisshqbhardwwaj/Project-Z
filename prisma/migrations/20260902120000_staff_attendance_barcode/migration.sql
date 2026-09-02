-- Staff attendance barcode + event log
ALTER TABLE "StaffMember" ADD COLUMN "attendanceBarcode" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN "attendanceBarcodeSetAt" DATETIME;

CREATE UNIQUE INDEX "StaffMember_organizationId_attendanceBarcode_key" ON "StaffMember"("organizationId", "attendanceBarcode");
CREATE INDEX "StaffMember_organizationId_attendanceBarcode_idx" ON "StaffMember"("organizationId", "attendanceBarcode");

ALTER TABLE "StaffAttendance" ADD COLUMN "deviceId" TEXT;

-- Redefine StaffAttendance staff FK to Restrict (preserve history when staff leaves)
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StaffAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "checkInAt" DATETIME,
    "checkOutAt" DATETIME,
    "checkInMethod" TEXT,
    "checkOutMethod" TEXT,
    "geoVerified" BOOLEAN,
    "geoDistanceMeters" REAL,
    "deviceFingerprint" TEXT,
    "deviceId" TEXT,
    "overtimeHours" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "markedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaffAttendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffAttendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StaffAttendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_StaffAttendance" SELECT * FROM "StaffAttendance";
DROP TABLE "StaffAttendance";
ALTER TABLE "new_StaffAttendance" RENAME TO "StaffAttendance";
CREATE UNIQUE INDEX "StaffAttendance_staffId_date_key" ON "StaffAttendance"("staffId", "date");
CREATE INDEX "StaffAttendance_organizationId_date_idx" ON "StaffAttendance"("organizationId", "date");
PRAGMA foreign_keys=ON;

CREATE TABLE "StaffAttendanceEvent" (
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
CREATE INDEX "StaffAttendanceEvent_organizationId_staffId_at_idx" ON "StaffAttendanceEvent"("organizationId", "staffId", "at");
CREATE INDEX "StaffAttendanceEvent_organizationId_at_idx" ON "StaffAttendanceEvent"("organizationId", "at");
