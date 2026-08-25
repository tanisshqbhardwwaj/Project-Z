-- Production modules + payroll expansion
ALTER TABLE "Organization" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';

CREATE TABLE "StaffWage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "wagePaise" BIGINT NOT NULL,
    "wagePeriod" TEXT NOT NULL,
    "overtimeRatePaise" BIGINT,
    "effectiveFrom" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffWage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffWage_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffWage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "StaffMember" ADD COLUMN "overtimeRatePaise" BIGINT;

ALTER TABLE "StaffAttendance" ADD COLUMN "overtimeHours" REAL NOT NULL DEFAULT 0;

CREATE TABLE "StaffAdvance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "repaidPaise" BIGINT NOT NULL DEFAULT 0,
    "monthlyDeductionPaise" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaffAdvance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffAdvance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffAdvance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "StaffPayroll" ADD COLUMN "workingDays" REAL NOT NULL DEFAULT 0;
ALTER TABLE "StaffPayroll" ADD COLUMN "overtimeHours" REAL NOT NULL DEFAULT 0;
ALTER TABLE "StaffPayroll" ADD COLUMN "driftCalculatedPaise" BIGINT;
ALTER TABLE "StaffPayroll" ADD COLUMN "expenseId" TEXT;
ALTER TABLE "StaffPayroll" ADD COLUMN "paymentId" TEXT;

CREATE TABLE "StaffPayrollLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payrollId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffPayrollLine_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "StaffPayroll" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "OrgHoliday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrgHoliday_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OrgHoliday_organizationId_date_key" ON "OrgHoliday"("organizationId", "date");

CREATE TABLE "ShopSale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "billNumber" TEXT,
    "customerName" TEXT,
    "totalPaise" BIGINT NOT NULL,
    "gstPaise" BIGINT NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "itemsJson" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShopSale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShopSale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "quantity" REAL NOT NULL DEFAULT 0,
    "reorderLevel" REAL NOT NULL DEFAULT 0,
    "costPaise" BIGINT,
    "sellPaise" BIGINT,
    "expiryDate" DATETIME,
    "sectorMeta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CustomerCredit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT,
    "balancePaise" BIGINT NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerCredit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "BoqItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "itemCode" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "ratePaise" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BoqItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BoqItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MeasurementEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "boqItemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeasurementEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeasurementEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MeasurementEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "MaterialIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "issuedTo" TEXT,
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaterialIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaterialIssue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaterialIssue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "DesignStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "feePaise" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DesignStage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DesignStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "DrawingRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DrawingRevision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DrawingRevision_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "DesignStage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DrawingRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "BuilderUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "floor" TEXT,
    "areaSqft" REAL,
    "pricePaise" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BuilderUnit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BuilderUnit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BuilderUnit_projectId_unitNumber_key" ON "BuilderUnit"("projectId", "unitNumber");

CREATE TABLE "UnitBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "bookingPaise" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "bookedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "UnitBooking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnitBooking_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnitBooking_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BuilderUnit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnitBooking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "StaffWage_staffId_effectiveFrom_idx" ON "StaffWage"("staffId", "effectiveFrom");
CREATE INDEX "StaffAdvance_organizationId_staffId_idx" ON "StaffAdvance"("organizationId", "staffId");
CREATE INDEX "StaffPayrollLine_payrollId_idx" ON "StaffPayrollLine"("payrollId");
CREATE INDEX "ShopSale_organizationId_createdAt_idx" ON "ShopSale"("organizationId", "createdAt");
CREATE INDEX "InventoryItem_organizationId_name_idx" ON "InventoryItem"("organizationId", "name");
CREATE INDEX "CustomerCredit_organizationId_customerName_idx" ON "CustomerCredit"("organizationId", "customerName");
CREATE INDEX "BoqItem_projectId_idx" ON "BoqItem"("projectId");
CREATE INDEX "MeasurementEntry_projectId_date_idx" ON "MeasurementEntry"("projectId", "date");
CREATE INDEX "MaterialIssue_projectId_date_idx" ON "MaterialIssue"("projectId", "date");
CREATE INDEX "DesignStage_projectId_sortOrder_idx" ON "DesignStage"("projectId", "sortOrder");
CREATE INDEX "DrawingRevision_stageId_revisionNo_idx" ON "DrawingRevision"("stageId", "revisionNo");
CREATE INDEX "UnitBooking_projectId_status_idx" ON "UnitBooking"("projectId", "status");

-- Backfill staff module for orgs with enableStaff
UPDATE "Organization" SET "settings" = json_set(COALESCE("settings", '{}'), '$.modules.staff', true) WHERE "enableStaff" = 1;
