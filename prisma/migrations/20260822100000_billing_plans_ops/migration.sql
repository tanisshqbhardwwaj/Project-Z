-- Billing plans, subscriptions, ops console, sync outbox, devices, storage metering

-- Organization billing fields
ALTER TABLE "Organization" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'BASIC';
ALTER TABLE "Organization" ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Organization" ADD COLUMN "storageQuotaBytes" BIGINT NOT NULL DEFAULT 2147483648;
ALTER TABLE "Organization" ADD COLUMN "storageUsedBytes" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "Organization" ADD COLUMN "currentPeriodEnd" DATETIME;
ALTER TABLE "Organization" ADD COLUMN "setupFeePaise" BIGINT;
ALTER TABLE "Organization" ADD COLUMN "setupFeeStatus" TEXT NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "Organization" ADD COLUMN "earlyBirdSetup" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "onboardingCompleteAt" DATETIME;
ALTER TABLE "Organization" ADD COLUMN "cancelledAt" DATETIME;
ALTER TABLE "Organization" ADD COLUMN "cancelReason" TEXT;
ALTER TABLE "Organization" ADD COLUMN "localPinHash" TEXT;

-- Existing orgs: active on Business plan with waived setup
UPDATE "Organization" SET "plan" = 'BUSINESS', "subscriptionStatus" = 'ACTIVE', "setupFeeStatus" = 'WAIVED', "storageQuotaBytes" = 5368709120 WHERE "businessType" = 'SHOPKEEPER';
UPDATE "Organization" SET "plan" = 'BUSINESS', "subscriptionStatus" = 'ACTIVE', "setupFeeStatus" = 'WAIVED', "storageQuotaBytes" = 5368709120 WHERE "businessType" != 'SHOPKEEPER';

CREATE TABLE "PlanRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "fromPlan" TEXT NOT NULL,
    "toPlan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "rejectReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlanRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlanRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "PlanRequest_organizationId_status_idx" ON "PlanRequest"("organizationId", "status");
CREATE INDEX "PlanRequest_status_createdAt_idx" ON "PlanRequest"("status", "createdAt");

CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorUserId" TEXT,
    "metadata" JSON NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BillingEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "BillingEvent_organizationId_createdAt_idx" ON "BillingEvent"("organizationId", "createdAt");

CREATE TABLE "SyncOutbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSON NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    CONSTRAINT "SyncOutbox_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SyncOutbox_organizationId_status_createdAt_idx" ON "SyncOutbox"("organizationId", "status", "createdAt");

CREATE TABLE "Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pairingToken" TEXT,
    "pairingExpires" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastSeenAt" DATETIME,
    "metadata" JSON NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Device_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Device_pairingToken_key" ON "Device"("pairingToken");
CREATE INDEX "Device_organizationId_status_idx" ON "Device"("organizationId", "status");

CREATE TABLE "StorageObject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "byteSize" BIGINT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'file',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StorageObject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StorageObject_storageKey_key" ON "StorageObject"("storageKey");
CREATE INDEX "StorageObject_organizationId_idx" ON "StorageObject"("organizationId");

CREATE TABLE "ShopInvoiceDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "draftJson" JSON NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopInvoiceDraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ShopInvoiceDraft_organizationId_key" ON "ShopInvoiceDraft"("organizationId");
