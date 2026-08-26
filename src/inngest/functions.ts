import { inngest, EXTRACTION_EVENT } from "@/inngest/client";
import { runWorkOrderExtraction } from "@/services/extraction.service";
import { ExtractionQuotaError } from "@/lib/ai/extraction-retry";
import { logger } from "@/lib/logger";

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

export const inngestFunctions = [runExtractionJob];
