-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "enableStaff" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "StaffAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "markedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaffAttendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffAttendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffAttendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StaffPayroll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "presentDays" REAL NOT NULL DEFAULT 0,
    "halfDays" REAL NOT NULL DEFAULT 0,
    "absentDays" REAL NOT NULL DEFAULT 0,
    "paidLeaveDays" REAL NOT NULL DEFAULT 0,
    "calculatedPaise" BIGINT NOT NULL DEFAULT 0,
    "adjustmentPaise" BIGINT NOT NULL DEFAULT 0,
    "finalAmountPaise" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "paidAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaffPayroll_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffPayroll_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffPayroll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StaffPayroll_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendance_staffId_date_key" ON "StaffAttendance"("staffId", "date");

-- CreateIndex
CREATE INDEX "StaffAttendance_organizationId_date_idx" ON "StaffAttendance"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StaffPayroll_staffId_year_month_key" ON "StaffPayroll"("staffId", "year", "month");

-- CreateIndex
CREATE INDEX "StaffPayroll_organizationId_year_month_idx" ON "StaffPayroll"("organizationId", "year", "month");
