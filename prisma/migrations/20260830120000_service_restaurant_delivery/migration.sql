-- Service business, delivery, restaurant, aggregator schema

-- Enums stored as TEXT in SQLite via Prisma

-- ShopSale extensions
ALTER TABLE "ShopSale" ADD COLUMN "orderType" TEXT;
ALTER TABLE "ShopSale" ADD COLUMN "tableId" TEXT;
ALTER TABLE "ShopSale" ADD COLUMN "deliveryAddress" TEXT;
ALTER TABLE "ShopSale" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'DIRECT';
ALTER TABLE "ShopSale" ADD COLUMN "channelOrderId" TEXT;
ALTER TABLE "ShopSale" ADD COLUMN "channelCommissionPaise" BIGINT;
ALTER TABLE "ShopSale" ADD COLUMN "channelPayoutPaise" BIGINT;
ALTER TABLE "ShopSale" ADD COLUMN "restaurantOrderId" TEXT;

CREATE UNIQUE INDEX "ShopSale_restaurantOrderId_key" ON "ShopSale"("restaurantOrderId");
CREATE INDEX "ShopSale_organizationId_channel_createdAt_idx" ON "ShopSale"("organizationId", "channel", "createdAt");
CREATE INDEX "ShopSale_organizationId_orderType_createdAt_idx" ON "ShopSale"("organizationId", "orderType", "createdAt");

-- ServicePackage (before CustomerPackage / ServiceAppointment)
CREATE TABLE "ServicePackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pricePaise" BIGINT NOT NULL,
    "sessionCount" INTEGER,
    "prepaidValuePaise" BIGINT,
    "validityDays" INTEGER,
    "includedServiceIdsJson" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServicePackage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServicePackage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ServicePackage_organizationId_isActive_idx" ON "ServicePackage"("organizationId", "isActive");

-- CustomerPackage
CREATE TABLE "CustomerPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "saleId" TEXT,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "remainingSessions" INTEGER,
    "remainingValuePaise" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerPackage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerPackage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ShopCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerPackage_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "ShopSale" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CustomerPackage_organizationId_customerId_status_idx" ON "CustomerPackage"("organizationId", "customerId", "status");
CREATE INDEX "CustomerPackage_organizationId_packageId_idx" ON "CustomerPackage"("organizationId", "packageId");

-- ServiceAppointment
CREATE TABLE "ServiceAppointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "staffId" TEXT,
    "itemsJson" JSONB NOT NULL DEFAULT '[]',
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "notes" TEXT,
    "source" TEXT,
    "customerPackageId" TEXT,
    "saleId" TEXT,
    "reminderSentAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceAppointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceAppointment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "ShopBranch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAppointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ShopCustomer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAppointment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAppointment_customerPackageId_fkey" FOREIGN KEY ("customerPackageId") REFERENCES "CustomerPackage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAppointment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "ShopSale" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceAppointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ServiceAppointment_saleId_key" ON "ServiceAppointment"("saleId");
CREATE INDEX "ServiceAppointment_organizationId_startAt_idx" ON "ServiceAppointment"("organizationId", "startAt");
CREATE INDEX "ServiceAppointment_organizationId_staffId_startAt_idx" ON "ServiceAppointment"("organizationId", "staffId", "startAt");
CREATE INDEX "ServiceAppointment_organizationId_status_startAt_idx" ON "ServiceAppointment"("organizationId", "status", "startAt");
CREATE INDEX "ServiceAppointment_organizationId_customerId_idx" ON "ServiceAppointment"("organizationId", "customerId");

-- ServiceContract
CREATE TABLE "ServiceContract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceIdsJson" JSONB NOT NULL DEFAULT '[]',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'YEARLY',
    "amountPaise" BIGINT NOT NULL,
    "visitsIncluded" INTEGER,
    "nextServiceDate" DATETIME,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 7,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceContract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceContract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ShopCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceContract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ServiceContract_organizationId_status_idx" ON "ServiceContract"("organizationId", "status");
CREATE INDEX "ServiceContract_organizationId_customerId_idx" ON "ServiceContract"("organizationId", "customerId");
CREATE INDEX "ServiceContract_organizationId_nextServiceDate_idx" ON "ServiceContract"("organizationId", "nextServiceDate");

-- ServiceContractVisit
CREATE TABLE "ServiceContractVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "appointmentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceContractVisit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceContractVisit_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ServiceContract" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceContractVisit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "ServiceAppointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ServiceContractVisit_organizationId_dueDate_idx" ON "ServiceContractVisit"("organizationId", "dueDate");
CREATE INDEX "ServiceContractVisit_contractId_dueDate_idx" ON "ServiceContractVisit"("contractId", "dueDate");

-- ServiceFollowUp
CREATE TABLE "ServiceFollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "dueDate" DATETIME NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceFollowUp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceFollowUp_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ShopCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceFollowUp_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "ServiceAppointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceFollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ServiceFollowUp_organizationId_dueDate_status_idx" ON "ServiceFollowUp"("organizationId", "dueDate", "status");
CREATE INDEX "ServiceFollowUp_organizationId_customerId_idx" ON "ServiceFollowUp"("organizationId", "customerId");

-- Delivery
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "saleId" TEXT,
    "appointmentId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "address" TEXT NOT NULL,
    "assignedStaffId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledAt" DATETIME,
    "deliveredAt" DATETIME,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Delivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Delivery_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "ShopBranch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Delivery_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "ShopSale" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Delivery_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "ServiceAppointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Delivery_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "StaffMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Delivery_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Delivery_organizationId_status_scheduledAt_idx" ON "Delivery"("organizationId", "status", "scheduledAt");
CREATE INDEX "Delivery_organizationId_assignedStaffId_status_idx" ON "Delivery"("organizationId", "assignedStaffId", "status");

-- RestaurantTable
CREATE TABLE "RestaurantTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT,
    "seats" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'FREE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RestaurantTable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RestaurantTable_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "ShopBranch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RestaurantTable_organizationId_branchId_name_key" ON "RestaurantTable"("organizationId", "branchId", "name");
CREATE INDEX "RestaurantTable_organizationId_branchId_status_idx" ON "RestaurantTable"("organizationId", "branchId", "status");

-- RestaurantOrder
CREATE TABLE "RestaurantOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "tableId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "waiterId" TEXT,
    "orderType" TEXT NOT NULL DEFAULT 'DINE_IN',
    "deliveryAddress" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'DIRECT',
    "channelOrderId" TEXT,
    "channelCommissionPaise" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "itemsJson" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RestaurantOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RestaurantOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "ShopBranch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RestaurantOrder_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RestaurantOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ShopCustomer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RestaurantOrder_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "StaffMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RestaurantOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "RestaurantOrder_organizationId_branchId_status_idx" ON "RestaurantOrder"("organizationId", "branchId", "status");
CREATE INDEX "RestaurantOrder_organizationId_tableId_status_idx" ON "RestaurantOrder"("organizationId", "tableId", "status");
CREATE INDEX "RestaurantOrder_organizationId_channel_createdAt_idx" ON "RestaurantOrder"("organizationId", "channel", "createdAt");

-- RestaurantKot
CREATE TABLE "RestaurantKot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "itemsJson" JSONB NOT NULL DEFAULT '[]',
    "kotJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RestaurantKot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RestaurantKot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "RestaurantKot_organizationId_status_createdAt_idx" ON "RestaurantKot"("organizationId", "status", "createdAt");
CREATE INDEX "RestaurantKot_orderId_roundNumber_idx" ON "RestaurantKot"("orderId", "roundNumber");

-- AggregatorPayout
CREATE TABLE "AggregatorPayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "grossPaise" BIGINT NOT NULL,
    "commissionPaise" BIGINT NOT NULL DEFAULT 0,
    "taxesPaise" BIGINT NOT NULL DEFAULT 0,
    "netPayoutPaise" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AggregatorPayout_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AggregatorPayout_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AggregatorPayout_organizationId_channel_periodStart_idx" ON "AggregatorPayout"("organizationId", "channel", "periodStart");

-- FK ShopSale.tableId and ShopSale.restaurantOrderId
-- SQLite: add via recreate not needed for nullable FK in Prisma migrate
