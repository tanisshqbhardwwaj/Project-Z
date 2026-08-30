-- Baseline PostgreSQL schema for Prisma Postgres.
-- Previous migrations were SQLite/Turso and cannot be replayed on Postgres.
-- Apply on a new empty database with: npx prisma migrate deploy

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PartnerRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'hi', 'en_hi');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'PARTNER', 'ACCOUNTANT', 'VIEWER', 'CASHIER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('EQUAL', 'PERCENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK', 'CARD', 'CHEQUE', 'CREDIT', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('VENDOR', 'SETTLEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('WORK_ORDER', 'RECEIPT', 'INVOICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('CONTRACTOR', 'ARCHITECT', 'BUILDER', 'SHOPKEEPER');

-- CreateEnum
CREATE TYPE "ShopSector" AS ENUM ('GROCERY', 'HARDWARE', 'ELECTRONICS', 'CLOTHING', 'PHARMACY', 'RESTAURANT', 'GENERAL', 'FOOTWEAR', 'COSMETICS', 'FURNITURE', 'STATIONERY', 'JEWELLERY', 'SERVICES', 'OTHER');

-- CreateEnum
CREATE TYPE "BillingPlan" AS ENUM ('BASIC', 'BUSINESS', 'PROFESSIONAL', 'BUSINESS_PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'PENDING_PAYMENT', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SetupFeeStatus" AS ENUM ('UNPAID', 'PAID', 'WAIVED');

-- CreateEnum
CREATE TYPE "PlanRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingEventType" AS ENUM ('PLAN_ACTIVATED', 'PLAN_CHANGED', 'PLAN_REQUEST', 'REQUEST_REJECTED', 'CANCELLED', 'REACTIVATED', 'SETUP_FEE_WAIVED', 'SETUP_FEE_PAID');

-- CreateEnum
CREATE TYPE "SyncOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('WINDOWS', 'ANDROID', 'IOS', 'MAC');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'LEFT');

-- CreateEnum
CREATE TYPE "StaffCommissionType" AS ENUM ('NONE', 'PERCENT', 'FIXED_PER_SALE', 'FIXED_PER_ITEM', 'FIXED_MONTHLY');

-- CreateEnum
CREATE TYPE "RecurringOccurrenceStatus" AS ENUM ('UPCOMING', 'PENDING', 'PAID', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'PAID_LEAVE');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID');

-- CreateEnum
CREATE TYPE "PayrollLineType" AS ENUM ('EARNING', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "AdvanceStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'VOID');

-- CreateEnum
CREATE TYPE "InvoicePaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'UNPAID');

-- CreateEnum
CREATE TYPE "PurchasePaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'UNPAID');

-- CreateEnum
CREATE TYPE "PurchaseRecordStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShopExpenseType" AS ENUM ('DAILY', 'MONTHLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('OPENING', 'SALE', 'PAYMENT', 'ADJUSTMENT', 'RETURN_REFUND');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED', 'DEFECTIVE', 'WRONG_PRODUCT', 'CUSTOMER_CHANGED_MIND', 'OTHER');

-- CreateEnum
CREATE TYPE "ReturnTransactionType" AS ENUM ('RETURN', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "HeldBillStatus" AS ENUM ('ACTIVE', 'RESUMED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferDiscountType" AS ENUM ('PERCENT', 'FIXED_AMOUNT', 'PRODUCT_PERCENT', 'PRODUCT_FIXED', 'CATEGORY_PERCENT', 'CATEGORY_FIXED', 'BUY_X_GET_Y', 'BUY_X_GET_X', 'CART_MIN_FLAT');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('BOOKED', 'CANCELLED', 'HANDED_OVER');

-- CreateEnum
CREATE TYPE "DesignStageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'SOLD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "locale" "Locale" NOT NULL DEFAULT 'en',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetaTestEmail" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetaTestEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL DEFAULT 'CONTRACTOR',
    "shopSector" "ShopSector",
    "enableStaff" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "defaultCompletionDays" INTEGER NOT NULL DEFAULT 30,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "plan" "BillingPlan" NOT NULL DEFAULT 'BASIC',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "storageQuotaBytes" BIGINT NOT NULL DEFAULT 2147483648,
    "storageUsedBytes" BIGINT NOT NULL DEFAULT 0,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodEnd" TIMESTAMP(3),
    "setupFeePaise" BIGINT,
    "setupFeeStatus" "SetupFeeStatus" NOT NULL DEFAULT 'UNPAID',
    "earlyBirdSetup" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompleteAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "localPinHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopBillCounter" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShopBillCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fromPlan" "BillingPlan" NOT NULL,
    "toPlan" "BillingPlan" NOT NULL,
    "status" "PlanRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "BillingEventType" NOT NULL,
    "actorUserId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncOutbox" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SyncOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "SyncOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncMutation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deviceId" TEXT,
    "kind" TEXT NOT NULL,
    "entityId" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncMutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "name" TEXT NOT NULL,
    "pairingToken" TEXT,
    "pairingExpires" TIMESTAMP(3),
    "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING',
    "lastSeenAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageObject" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "byteSize" BIGINT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'file',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopInvoiceDraft" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "draftJson" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopInvoiceDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'PARTNER',
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "roleKey" TEXT,
    "cashierCode" TEXT,
    "roleTitle" TEXT NOT NULL,
    "wagePaise" BIGINT,
    "wagePeriod" TEXT,
    "paymentFrequency" TEXT,
    "overtimeRatePaise" BIGINT,
    "commissionType" "StaffCommissionType" NOT NULL DEFAULT 'NONE',
    "commissionPercent" DOUBLE PRECISION,
    "commissionAmountPaise" BIGINT,
    "accessJson" JSONB NOT NULL DEFAULT '{}',
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffWage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "wagePaise" BIGINT NOT NULL,
    "wagePeriod" TEXT NOT NULL,
    "overtimeRatePaise" BIGINT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffWage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAttendance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "markedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAdvance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "repaidPaise" BIGINT NOT NULL DEFAULT 0,
    "monthlyDeductionPaise" BIGINT,
    "status" "AdvanceStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "shopExpenseId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffPayroll" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "presentDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "halfDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "absentDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidLeaveDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workingDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "basePaise" BIGINT NOT NULL DEFAULT 0,
    "commissionPaise" BIGINT NOT NULL DEFAULT 0,
    "commissionSalesPaise" BIGINT NOT NULL DEFAULT 0,
    "calculatedPaise" BIGINT NOT NULL DEFAULT 0,
    "adjustmentPaise" BIGINT NOT NULL DEFAULT 0,
    "finalAmountPaise" BIGINT NOT NULL DEFAULT 0,
    "driftCalculatedPaise" BIGINT,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "paidAt" TIMESTAMP(3),
    "expenseId" TEXT,
    "paymentId" TEXT,
    "shopExpenseId" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffPayroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffPayrollLine" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "type" "PayrollLineType" NOT NULL,
    "label" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffPayrollLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgHoliday" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSale" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "billNumber" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerGstin" TEXT,
    "staffId" TEXT,
    "salesBoyName" TEXT,
    "totalPaise" BIGINT NOT NULL,
    "gstPaise" BIGINT NOT NULL DEFAULT 0,
    "paidAmountPaise" BIGINT NOT NULL DEFAULT 0,
    "totalCostPaise" BIGINT NOT NULL DEFAULT 0,
    "paymentStatus" "InvoicePaymentStatus" NOT NULL DEFAULT 'PAID',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "issueInvoice" BOOLEAN NOT NULL DEFAULT false,
    "itemsJson" JSONB NOT NULL,
    "notes" TEXT,
    "pricingJson" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopHeldBill" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "holdNumber" INTEGER NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerGstin" TEXT,
    "salesBoyName" TEXT,
    "cartJson" JSONB NOT NULL,
    "pricingJson" JSONB NOT NULL DEFAULT '{}',
    "status" "HeldBillStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "resumedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopHeldBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "InventoryStockReservation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "heldBillId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryStockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOffer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "OfferDiscountType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "productIdsJson" JSONB,
    "categoryKeysJson" JSONB,
    "minQuantity" INTEGER,
    "minPurchasePaise" BIGINT,
    "buyQuantity" INTEGER,
    "getQuantity" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "totalDiscountPaise" BIGINT NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSaleReturn" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shopSaleId" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "type" "ReturnTransactionType" NOT NULL DEFAULT 'RETURN',
    "returnValuePaise" BIGINT NOT NULL DEFAULT 0,
    "exchangeValuePaise" BIGINT NOT NULL DEFAULT 0,
    "additionalPaidPaise" BIGINT NOT NULL DEFAULT 0,
    "refundAmountPaise" BIGINT NOT NULL,
    "refundMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reason" "ReturnReason" NOT NULL,
    "notes" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "staffId" TEXT,
    "staffName" TEXT,
    "exchangeSaleId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopSaleReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSaleReturnLine" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "lineKey" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "size" TEXT,
    "variantLabel" TEXT,
    "sku" TEXT,
    "unitLabel" TEXT,
    "barcode" TEXT,
    "originalQty" DOUBLE PRECISION NOT NULL,
    "returnQty" DOUBLE PRECISION NOT NULL,
    "unitPricePaise" BIGINT NOT NULL,
    "lineRefundPaise" BIGINT NOT NULL,
    "isExchangeOut" BOOLEAN NOT NULL DEFAULT true,
    "isExchangeIn" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ShopSaleReturnLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCustomer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "gstin" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "lastSaleAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopProduct" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand" TEXT,
    "categoryKey" TEXT,
    "subCategoryKey" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "hasVariants" BOOLEAN NOT NULL DEFAULT false,
    "variantAxis" TEXT,
    "supplierName" TEXT,
    "batchNo" TEXT,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT,
    "sku" TEXT,
    "size" TEXT,
    "color" TEXT,
    "variantLabel" TEXT,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPaise" BIGINT,
    "sellPaise" BIGINT,
    "supplierName" TEXT,
    "batchNo" TEXT,
    "expiryDate" TIMESTAMP(3),
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "sectorMeta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "parentKey" TEXT,
    "sectorKey" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerCredit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shopCustomerId" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT,
    "balancePaise" BIGINT NOT NULL DEFAULT 0,
    "creditLimitPaise" BIGINT,
    "totalPurchasesPaise" BIGINT NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerCreditEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "shopSaleId" TEXT,
    "type" "CreditTransactionType" NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "balanceAfterPaise" BIGINT NOT NULL,
    "paymentMethod" "PaymentMethod",
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerCreditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSupplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gstNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopPurchase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "billNumber" TEXT,
    "subtotalPaise" BIGINT NOT NULL,
    "discountPaise" BIGINT NOT NULL DEFAULT 0,
    "taxPaise" BIGINT NOT NULL DEFAULT 0,
    "extraChargesPaise" BIGINT NOT NULL DEFAULT 0,
    "totalPaise" BIGINT NOT NULL,
    "paidAmountPaise" BIGINT NOT NULL DEFAULT 0,
    "paymentStatus" "PurchasePaymentStatus" NOT NULL DEFAULT 'PAID',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "PurchaseRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopPurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "ratePaise" BIGINT NOT NULL,
    "lineTotalPaise" BIGINT NOT NULL,

    CONSTRAINT "ShopPurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopPurchasePayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopPurchasePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopExpenseCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopExpense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amountPaise" BIGINT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "paidBy" TEXT,
    "expenseType" "ShopExpenseType" NOT NULL DEFAULT 'DAILY',
    "notes" TEXT,
    "receiptHash" TEXT,
    "staffId" TEXT,
    "staffAdvanceId" TEXT,
    "payrollId" TEXT,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopRecurringExpense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyAmountPaise" BIGINT NOT NULL,
    "dueDay" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "paymentMethod" "PaymentMethod",
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopRecurringExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopRecurringExpenseOccurrence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recurringId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "status" "RecurringOccurrenceStatus" NOT NULL DEFAULT 'UPCOMING',
    "paidAt" TIMESTAMP(3),
    "paidAmountPaise" BIGINT,
    "paymentMethod" "PaymentMethod",
    "shopExpenseId" TEXT,
    "notes" TEXT,
    "remindedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopRecurringExpenseOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoqItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "itemCode" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "ratePaise" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeasurementEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "boqItemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeasurementEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialIssue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "issuedTo" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignStage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "feePaise" BIGINT,
    "status" "DesignStageStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingRevision" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderUnit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "floor" TEXT,
    "areaSqft" DOUBLE PRECISION,
    "pricePaise" BIGINT,
    "status" "UnitStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitBooking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "bookingPaise" BIGINT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'BOOKED',
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "UnitBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'PARTNER',
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "contractAmountPaise" BIGINT NOT NULL DEFAULT 0,
    "budgetAmountPaise" BIGINT,
    "location" TEXT,
    "description" TEXT,
    "expectedStartDate" TIMESTAMP(3),
    "expectedCompletionDate" TIMESTAMP(3),
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "splitType" "SplitType" NOT NULL DEFAULT 'EQUAL',
    "splitValue" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectInvite" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPartnerRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inviteId" TEXT,
    "status" "PartnerRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectPartnerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSplitConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "splitType" "SplitType" NOT NULL DEFAULT 'EQUAL',
    "splits" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSplitConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workOrderNumber" TEXT NOT NULL,
    "workOrderDate" TIMESTAMP(3) NOT NULL,
    "clientName" TEXT NOT NULL,
    "headOfAccount" TEXT,
    "timeOfCompletion" TEXT,
    "paymentTerms" TEXT,
    "taxInfo" JSONB,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gstNumber" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vendorId" TEXT,
    "categoryId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "paidAmountPaise" BIGINT NOT NULL DEFAULT 0,
    "outstandingPaise" BIGINT NOT NULL DEFAULT 0,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "receiptHash" TEXT,
    "createdById" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "editedById" TEXT,
    "originalAmountPaise" BIGINT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "vendorId" TEXT,
    "paidByUserId" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "amountPaise" BIGINT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "referenceNumber" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentType" "PaymentType" NOT NULL DEFAULT 'VENDOR',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "expenseId" TEXT,
    "workOrderId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileHash" TEXT,
    "documentType" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIExtraction" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "rawResponse" JSONB,
    "extractedFields" JSONB NOT NULL DEFAULT '[]',
    "userCorrections" JSONB,
    "errorMessage" TEXT,
    "extractedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BetaTestEmail_email_key" ON "BetaTestEmail"("email");

-- CreateIndex
CREATE INDEX "BetaTestEmail_email_idx" ON "BetaTestEmail"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ShopBillCounter_organizationId_fiscalYear_key" ON "ShopBillCounter"("organizationId", "fiscalYear");

-- CreateIndex
CREATE INDEX "PlanRequest_organizationId_status_idx" ON "PlanRequest"("organizationId", "status");

-- CreateIndex
CREATE INDEX "PlanRequest_status_createdAt_idx" ON "PlanRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BillingEvent_organizationId_createdAt_idx" ON "BillingEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "SyncOutbox_organizationId_status_createdAt_idx" ON "SyncOutbox"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SyncMutation_organizationId_appliedAt_idx" ON "SyncMutation"("organizationId", "appliedAt");

-- CreateIndex
CREATE INDEX "SyncMutation_organizationId_kind_idx" ON "SyncMutation"("organizationId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Device_pairingToken_key" ON "Device"("pairingToken");

-- CreateIndex
CREATE INDEX "Device_organizationId_status_idx" ON "Device"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StorageObject_storageKey_key" ON "StorageObject"("storageKey");

-- CreateIndex
CREATE INDEX "StorageObject_organizationId_idx" ON "StorageObject"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopInvoiceDraft_organizationId_key" ON "ShopInvoiceDraft"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_organizationId_idx" ON "OrganizationMember"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_status_idx" ON "OrganizationMember"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "StaffMember_organizationId_status_idx" ON "StaffMember"("organizationId", "status");

-- CreateIndex
CREATE INDEX "StaffMember_userId_idx" ON "StaffMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_organizationId_userId_key" ON "StaffMember"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_organizationId_cashierCode_key" ON "StaffMember"("organizationId", "cashierCode");

-- CreateIndex
CREATE INDEX "StaffWage_staffId_effectiveFrom_idx" ON "StaffWage"("staffId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "StaffAttendance_organizationId_date_idx" ON "StaffAttendance"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendance_staffId_date_key" ON "StaffAttendance"("staffId", "date");

-- CreateIndex
CREATE INDEX "StaffAdvance_organizationId_staffId_idx" ON "StaffAdvance"("organizationId", "staffId");

-- CreateIndex
CREATE INDEX "StaffPayroll_organizationId_year_month_idx" ON "StaffPayroll"("organizationId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "StaffPayroll_staffId_year_month_key" ON "StaffPayroll"("staffId", "year", "month");

-- CreateIndex
CREATE INDEX "StaffPayrollLine_payrollId_idx" ON "StaffPayrollLine"("payrollId");

-- CreateIndex
CREATE INDEX "OrgHoliday_organizationId_date_idx" ON "OrgHoliday"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "OrgHoliday_organizationId_date_key" ON "OrgHoliday"("organizationId", "date");

-- CreateIndex
CREATE INDEX "ShopSale_organizationId_createdAt_idx" ON "ShopSale"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ShopSale_organizationId_customerId_idx" ON "ShopSale"("organizationId", "customerId");

-- CreateIndex
CREATE INDEX "ShopSale_organizationId_paymentStatus_idx" ON "ShopSale"("organizationId", "paymentStatus");

-- CreateIndex
CREATE INDEX "ShopSale_organizationId_billNumber_idx" ON "ShopSale"("organizationId", "billNumber");

-- CreateIndex
CREATE INDEX "ShopSale_organizationId_salesBoyName_createdAt_idx" ON "ShopSale"("organizationId", "salesBoyName", "createdAt");

-- CreateIndex
CREATE INDEX "ShopSale_organizationId_staffId_createdAt_idx" ON "ShopSale"("organizationId", "staffId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSale_organizationId_billNumber_key" ON "ShopSale"("organizationId", "billNumber");

-- CreateIndex
CREATE INDEX "ShopHeldBill_organizationId_status_expiresAt_idx" ON "ShopHeldBill"("organizationId", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopHeldBill_organizationId_holdNumber_key" ON "ShopHeldBill"("organizationId", "holdNumber");

-- CreateIndex
CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

-- CreateIndex
CREATE INDEX "InventoryStockReservation_organizationId_inventoryItemId_idx" ON "InventoryStockReservation"("organizationId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "InventoryStockReservation_heldBillId_idx" ON "InventoryStockReservation"("heldBillId");

-- CreateIndex
CREATE INDEX "InventoryStockReservation_expiresAt_idx" ON "InventoryStockReservation"("expiresAt");

-- CreateIndex
CREATE INDEX "ShopOffer_organizationId_isActive_startDate_endDate_idx" ON "ShopOffer"("organizationId", "isActive", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ShopSaleReturn_organizationId_shopSaleId_idx" ON "ShopSaleReturn"("organizationId", "shopSaleId");

-- CreateIndex
CREATE INDEX "ShopSaleReturn_organizationId_createdAt_idx" ON "ShopSaleReturn"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ShopSaleReturn_organizationId_staffId_idx" ON "ShopSaleReturn"("organizationId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSaleReturn_organizationId_returnNumber_key" ON "ShopSaleReturn"("organizationId", "returnNumber");

-- CreateIndex
CREATE INDEX "ShopSaleReturnLine_returnId_idx" ON "ShopSaleReturnLine"("returnId");

-- CreateIndex
CREATE INDEX "ShopCustomer_organizationId_name_idx" ON "ShopCustomer"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCustomer_organizationId_phone_key" ON "ShopCustomer"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "ShopProduct_organizationId_name_idx" ON "ShopProduct"("organizationId", "name");

-- CreateIndex
CREATE INDEX "ShopProduct_organizationId_categoryKey_idx" ON "ShopProduct"("organizationId", "categoryKey");

-- CreateIndex
CREATE INDEX "ShopProduct_organizationId_deletedAt_idx" ON "ShopProduct"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "InventoryItem_organizationId_name_idx" ON "InventoryItem"("organizationId", "name");

-- CreateIndex
CREATE INDEX "InventoryItem_organizationId_productId_idx" ON "InventoryItem"("organizationId", "productId");

-- CreateIndex
CREATE INDEX "InventoryItem_organizationId_sku_idx" ON "InventoryItem"("organizationId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_organizationId_barcode_key" ON "InventoryItem"("organizationId", "barcode");

-- CreateIndex
CREATE INDEX "ShopCategory_organizationId_parentKey_idx" ON "ShopCategory"("organizationId", "parentKey");

-- CreateIndex
CREATE INDEX "ShopCategory_organizationId_isActive_idx" ON "ShopCategory"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCategory_organizationId_key_key" ON "ShopCategory"("organizationId", "key");

-- CreateIndex
CREATE INDEX "CustomerCredit_organizationId_customerName_idx" ON "CustomerCredit"("organizationId", "customerName");

-- CreateIndex
CREATE INDEX "CustomerCredit_organizationId_shopCustomerId_idx" ON "CustomerCredit"("organizationId", "shopCustomerId");

-- CreateIndex
CREATE INDEX "CustomerCreditEntry_organizationId_creditId_createdAt_idx" ON "CustomerCreditEntry"("organizationId", "creditId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CustomerCreditEntry_shopSaleId_idx" ON "CustomerCreditEntry"("shopSaleId");

-- CreateIndex
CREATE INDEX "ShopSupplier_organizationId_idx" ON "ShopSupplier"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSupplier_organizationId_name_key" ON "ShopSupplier"("organizationId", "name");

-- CreateIndex
CREATE INDEX "ShopPurchase_organizationId_purchaseDate_idx" ON "ShopPurchase"("organizationId", "purchaseDate" DESC);

-- CreateIndex
CREATE INDEX "ShopPurchase_organizationId_supplierId_idx" ON "ShopPurchase"("organizationId", "supplierId");

-- CreateIndex
CREATE INDEX "ShopPurchase_organizationId_paymentStatus_idx" ON "ShopPurchase"("organizationId", "paymentStatus");

-- CreateIndex
CREATE INDEX "ShopPurchase_organizationId_status_idx" ON "ShopPurchase"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPurchase_organizationId_idempotencyKey_key" ON "ShopPurchase"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ShopPurchaseItem_purchaseId_idx" ON "ShopPurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "ShopPurchaseItem_inventoryItemId_idx" ON "ShopPurchaseItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "ShopPurchasePayment_organizationId_purchaseId_createdAt_idx" ON "ShopPurchasePayment"("organizationId", "purchaseId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ShopExpenseCategory_organizationId_idx" ON "ShopExpenseCategory"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopExpenseCategory_organizationId_name_key" ON "ShopExpenseCategory"("organizationId", "name");

-- CreateIndex
CREATE INDEX "ShopExpense_organizationId_expenseDate_idx" ON "ShopExpense"("organizationId", "expenseDate" DESC);

-- CreateIndex
CREATE INDEX "ShopExpense_organizationId_categoryId_idx" ON "ShopExpense"("organizationId", "categoryId");

-- CreateIndex
CREATE INDEX "ShopExpense_organizationId_expenseType_idx" ON "ShopExpense"("organizationId", "expenseType");

-- CreateIndex
CREATE INDEX "ShopExpense_organizationId_staffId_idx" ON "ShopExpense"("organizationId", "staffId");

-- CreateIndex
CREATE INDEX "ShopExpense_organizationId_payrollId_idx" ON "ShopExpense"("organizationId", "payrollId");

-- CreateIndex
CREATE INDEX "ShopExpense_organizationId_deletedAt_idx" ON "ShopExpense"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "ShopRecurringExpense_organizationId_isActive_idx" ON "ShopRecurringExpense"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "ShopRecurringExpense_organizationId_deletedAt_idx" ON "ShopRecurringExpense"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "ShopRecurringExpenseOccurrence_organizationId_status_dueDat_idx" ON "ShopRecurringExpenseOccurrence"("organizationId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "ShopRecurringExpenseOccurrence_organizationId_dueDate_idx" ON "ShopRecurringExpenseOccurrence"("organizationId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ShopRecurringExpenseOccurrence_recurringId_periodYear_perio_key" ON "ShopRecurringExpenseOccurrence"("recurringId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "BoqItem_projectId_idx" ON "BoqItem"("projectId");

-- CreateIndex
CREATE INDEX "MeasurementEntry_projectId_date_idx" ON "MeasurementEntry"("projectId", "date");

-- CreateIndex
CREATE INDEX "MaterialIssue_projectId_date_idx" ON "MaterialIssue"("projectId", "date");

-- CreateIndex
CREATE INDEX "DesignStage_projectId_sortOrder_idx" ON "DesignStage"("projectId", "sortOrder");

-- CreateIndex
CREATE INDEX "DrawingRevision_stageId_revisionNo_idx" ON "DrawingRevision"("stageId", "revisionNo");

-- CreateIndex
CREATE UNIQUE INDEX "BuilderUnit_projectId_unitNumber_key" ON "BuilderUnit"("projectId", "unitNumber");

-- CreateIndex
CREATE INDEX "UnitBooking_projectId_status_idx" ON "UnitBooking"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvite_token_key" ON "OrganizationInvite"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvite_organizationId_email_idx" ON "OrganizationInvite"("organizationId", "email");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX "Project_organizationId_status_idx" ON "Project"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Project_organizationId_deletedAt_idx" ON "Project"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_userId_idx" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInvite_token_key" ON "ProjectInvite"("token");

-- CreateIndex
CREATE INDEX "ProjectInvite_projectId_idx" ON "ProjectInvite"("projectId");

-- CreateIndex
CREATE INDEX "ProjectInvite_organizationId_email_idx" ON "ProjectInvite"("organizationId", "email");

-- CreateIndex
CREATE INDEX "ProjectPartnerRequest_projectId_status_idx" ON "ProjectPartnerRequest"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPartnerRequest_projectId_userId_key" ON "ProjectPartnerRequest"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSplitConfig_projectId_key" ON "ProjectSplitConfig"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_projectId_key" ON "WorkOrder"("projectId");

-- CreateIndex
CREATE INDEX "WorkOrder_organizationId_idx" ON "WorkOrder"("organizationId");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_idx" ON "Vendor"("organizationId");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_deletedAt_idx" ON "Vendor"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_organizationId_name_key" ON "Vendor"("organizationId", "name");

-- CreateIndex
CREATE INDEX "ExpenseCategory_organizationId_idx" ON "ExpenseCategory"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_organizationId_name_key" ON "ExpenseCategory"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Expense_organizationId_idx" ON "Expense"("organizationId");

-- CreateIndex
CREATE INDEX "Expense_projectId_expenseDate_idx" ON "Expense"("projectId", "expenseDate");

-- CreateIndex
CREATE INDEX "Expense_vendorId_idx" ON "Expense"("vendorId");

-- CreateIndex
CREATE INDEX "Expense_organizationId_deletedAt_idx" ON "Expense"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "Payment_organizationId_idx" ON "Payment"("organizationId");

-- CreateIndex
CREATE INDEX "Payment_vendorId_paymentDate_idx" ON "Payment"("vendorId", "paymentDate");

-- CreateIndex
CREATE INDEX "Payment_projectId_idx" ON "Payment"("projectId");

-- CreateIndex
CREATE INDEX "Payment_paidByUserId_idx" ON "Payment"("paidByUserId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_deletedAt_idx" ON "Payment"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_expenseId_idx" ON "PaymentAllocation"("expenseId");

-- CreateIndex
CREATE INDEX "Document_organizationId_idx" ON "Document"("organizationId");

-- CreateIndex
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");

-- CreateIndex
CREATE INDEX "Document_expenseId_idx" ON "Document"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "AIExtraction_documentId_key" ON "AIExtraction"("documentId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "BetaTestEmail" ADD CONSTRAINT "BetaTestEmail_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopBillCounter" ADD CONSTRAINT "ShopBillCounter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanRequest" ADD CONSTRAINT "PlanRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanRequest" ADD CONSTRAINT "PlanRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanRequest" ADD CONSTRAINT "PlanRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncOutbox" ADD CONSTRAINT "SyncOutbox_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncMutation" ADD CONSTRAINT "SyncMutation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageObject" ADD CONSTRAINT "StorageObject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopInvoiceDraft" ADD CONSTRAINT "ShopInvoiceDraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffWage" ADD CONSTRAINT "StaffWage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffWage" ADD CONSTRAINT "StaffWage_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffWage" ADD CONSTRAINT "StaffWage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAdvance" ADD CONSTRAINT "StaffAdvance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAdvance" ADD CONSTRAINT "StaffAdvance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAdvance" ADD CONSTRAINT "StaffAdvance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPayroll" ADD CONSTRAINT "StaffPayroll_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPayroll" ADD CONSTRAINT "StaffPayroll_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPayroll" ADD CONSTRAINT "StaffPayroll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPayroll" ADD CONSTRAINT "StaffPayroll_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPayrollLine" ADD CONSTRAINT "StaffPayrollLine_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "StaffPayroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgHoliday" ADD CONSTRAINT "OrgHoliday_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSale" ADD CONSTRAINT "ShopSale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSale" ADD CONSTRAINT "ShopSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ShopCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSale" ADD CONSTRAINT "ShopSale_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSale" ADD CONSTRAINT "ShopSale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopHeldBill" ADD CONSTRAINT "ShopHeldBill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopHeldBill" ADD CONSTRAINT "ShopHeldBill_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ShopCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopHeldBill" ADD CONSTRAINT "ShopHeldBill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStockReservation" ADD CONSTRAINT "InventoryStockReservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStockReservation" ADD CONSTRAINT "InventoryStockReservation_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStockReservation" ADD CONSTRAINT "InventoryStockReservation_heldBillId_fkey" FOREIGN KEY ("heldBillId") REFERENCES "ShopHeldBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOffer" ADD CONSTRAINT "ShopOffer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOffer" ADD CONSTRAINT "ShopOffer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSaleReturn" ADD CONSTRAINT "ShopSaleReturn_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSaleReturn" ADD CONSTRAINT "ShopSaleReturn_shopSaleId_fkey" FOREIGN KEY ("shopSaleId") REFERENCES "ShopSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSaleReturn" ADD CONSTRAINT "ShopSaleReturn_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSaleReturn" ADD CONSTRAINT "ShopSaleReturn_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSaleReturnLine" ADD CONSTRAINT "ShopSaleReturnLine_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "ShopSaleReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCustomer" ADD CONSTRAINT "ShopCustomer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCategory" ADD CONSTRAINT "ShopCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCredit" ADD CONSTRAINT "CustomerCredit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCredit" ADD CONSTRAINT "CustomerCredit_shopCustomerId_fkey" FOREIGN KEY ("shopCustomerId") REFERENCES "ShopCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCreditEntry" ADD CONSTRAINT "CustomerCreditEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCreditEntry" ADD CONSTRAINT "CustomerCreditEntry_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "CustomerCredit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCreditEntry" ADD CONSTRAINT "CustomerCreditEntry_shopSaleId_fkey" FOREIGN KEY ("shopSaleId") REFERENCES "ShopSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCreditEntry" ADD CONSTRAINT "CustomerCreditEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopSupplier" ADD CONSTRAINT "ShopSupplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPurchase" ADD CONSTRAINT "ShopPurchase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPurchase" ADD CONSTRAINT "ShopPurchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "ShopSupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPurchase" ADD CONSTRAINT "ShopPurchase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPurchaseItem" ADD CONSTRAINT "ShopPurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "ShopPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPurchasePayment" ADD CONSTRAINT "ShopPurchasePayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPurchasePayment" ADD CONSTRAINT "ShopPurchasePayment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "ShopPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopPurchasePayment" ADD CONSTRAINT "ShopPurchasePayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopExpenseCategory" ADD CONSTRAINT "ShopExpenseCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopExpense" ADD CONSTRAINT "ShopExpense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopExpense" ADD CONSTRAINT "ShopExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ShopExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopExpense" ADD CONSTRAINT "ShopExpense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRecurringExpense" ADD CONSTRAINT "ShopRecurringExpense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRecurringExpense" ADD CONSTRAINT "ShopRecurringExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ShopExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRecurringExpense" ADD CONSTRAINT "ShopRecurringExpense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRecurringExpenseOccurrence" ADD CONSTRAINT "ShopRecurringExpenseOccurrence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRecurringExpenseOccurrence" ADD CONSTRAINT "ShopRecurringExpenseOccurrence_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "ShopRecurringExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoqItem" ADD CONSTRAINT "BoqItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoqItem" ADD CONSTRAINT "BoqItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementEntry" ADD CONSTRAINT "MeasurementEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementEntry" ADD CONSTRAINT "MeasurementEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasurementEntry" ADD CONSTRAINT "MeasurementEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignStage" ADD CONSTRAINT "DesignStage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignStage" ADD CONSTRAINT "DesignStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "DesignStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderUnit" ADD CONSTRAINT "BuilderUnit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderUnit" ADD CONSTRAINT "BuilderUnit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitBooking" ADD CONSTRAINT "UnitBooking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitBooking" ADD CONSTRAINT "UnitBooking_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitBooking" ADD CONSTRAINT "UnitBooking_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "BuilderUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitBooking" ADD CONSTRAINT "UnitBooking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPartnerRequest" ADD CONSTRAINT "ProjectPartnerRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPartnerRequest" ADD CONSTRAINT "ProjectPartnerRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPartnerRequest" ADD CONSTRAINT "ProjectPartnerRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPartnerRequest" ADD CONSTRAINT "ProjectPartnerRequest_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "ProjectInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPartnerRequest" ADD CONSTRAINT "ProjectPartnerRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSplitConfig" ADD CONSTRAINT "ProjectSplitConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIExtraction" ADD CONSTRAINT "AIExtraction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

