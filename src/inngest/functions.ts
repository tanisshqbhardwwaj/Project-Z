import { inngest, EXTRACTION_EVENT } from "@/inngest/client";
import { runWorkOrderExtraction } from "@/services/shared/extraction.service";
import { ExtractionQuotaError } from "@/lib/ai/extraction-retry";
import { logger } from "@/lib/logger";
import {
  listOrgsForPaymentReminderScan,
  syncUdhaarPaymentReminders,
} from "@/services/shop/shop-payment-reminder.service";
import {
  listServiceOrgsForReminders,
  syncServiceReminders,
} from "@/services/service/service-reminder.service";

export const runExtractionJob = inngest.createFunction(
  {
    id: "run-work-order-extraction",
    name: "Run Work Order Extraction",
    retries: 3,
    triggers: [{ event: EXTRACTION_EVENT }],
  },
  async ({ event }) => {
    const { documentId, extractionId } = event.data as {
      documentId: string;
      extractionId: string;
    };

    logger.info("extraction.job.start", { documentId, extractionId });
    try {
      await runWorkOrderExtraction(documentId, extractionId);
    } catch (error) {
      if (error instanceof ExtractionQuotaError) {
        logger.warn("extraction.quota_no_retry", { documentId, extractionId });
        return { status: "quota_fallback" };
      }
      throw error;
    }
    logger.info("extraction.job.complete", { documentId, extractionId });
    return { status: "complete" };
  }
);

export const scanUdhaarPaymentReminders = inngest.createFunction(
  {
    id: "scan-udhaar-payment-reminders",
    name: "Scan Udhaar Payment Reminders",
    triggers: [{ cron: "TZ=Asia/Kolkata 0 9 * * *", jitter: "5m" }],
  },
  async ({ step }) => {
    const orgIds = await step.run("list-orgs", () => listOrgsForPaymentReminderScan());
    let total = 0;
    for (const orgId of orgIds) {
      const result = await step.run(`sync-${orgId}`, () =>
        syncUdhaarPaymentReminders(orgId)
      );
      total += result.candidates;
    }
    logger.info("payment_reminders.scan.complete", { orgCount: orgIds.length, total });
    return { orgCount: orgIds.length, candidateCount: total };
  }
);

export const prunePlatformData = inngest.createFunction(
  {
    id: "prune-platform-data",
    name: "Prune stale audit logs and sync rows",
    triggers: [{ cron: "TZ=Asia/Kolkata 0 3 * * 0", jitter: "10m" }],
  },
  async () => {
    const { pruneStalePlatformData } = await import("@/services/shared/data-retention.service");
    const result = await pruneStalePlatformData();
    logger.info("data_retention.prune.complete", result);
    return result;
  }
);

export const scanServiceReminders = inngest.createFunction(
  {
    id: "scan-service-reminders",
    name: "Scan Service Reminders",
    triggers: [{ cron: "TZ=Asia/Kolkata 30 8 * * *", jitter: "5m" }],
  },
  async ({ step }) => {
    const orgIds = await step.run("list-service-orgs", () =>
      listServiceOrgsForReminders()
    );
    let total = 0;
    for (const orgId of orgIds) {
      const result = await step.run(`sync-service-${orgId}`, () =>
        syncServiceReminders(orgId)
      );
      total += result.appointments + result.amc + result.followUps;
    }
    logger.info("service_reminders.scan.complete", { orgCount: orgIds.length, total });
    return { orgCount: orgIds.length, candidateCount: total };
  }
);

export const inngestFunctions = [
  runExtractionJob,
  scanUdhaarPaymentReminders,
  scanServiceReminders,
  prunePlatformData,
];
