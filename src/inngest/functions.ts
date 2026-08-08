import { inngest, EXTRACTION_EVENT } from "@/inngest/client";
import { runWorkOrderExtraction } from "@/services/extraction.service";
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
    await runWorkOrderExtraction(documentId, extractionId);
    logger.info("extraction.job.complete", { documentId, extractionId });
  }
);

export const inngestFunctions = [runExtractionJob];
