-- CreateTable (SQLite / Turso)
CREATE TABLE "ProjectBillCounter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProjectBillCounter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProjectInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "clientName" TEXT,
    "clientPhone" TEXT,
    "clientGstin" TEXT,
    "totalPaise" BIGINT NOT NULL,
    "gstPaise" BIGINT NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "itemsJson" JSONB NOT NULL,
    "pricingJson" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectInvoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProjectBillCounter_projectId_fiscalYear_key" ON "ProjectBillCounter"("projectId", "fiscalYear");
CREATE UNIQUE INDEX "ProjectInvoice_projectId_billNumber_key" ON "ProjectInvoice"("projectId", "billNumber");
CREATE INDEX "ProjectInvoice_organizationId_idx" ON "ProjectInvoice"("organizationId");
CREATE INDEX "ProjectInvoice_projectId_createdAt_idx" ON "ProjectInvoice"("projectId", "createdAt");
