import { EXTRACTION_EVENT, inngest, isInngestEnabled, type ExtractionEventData } from "@/inngest/client";
import { logger } from "@/lib/logger";
import { ExtractionQuotaError } from "@/lib/ai/extraction-retry";

export async function queueWorkOrderExtraction(data: ExtractionEventData) {
  if (isInngestEnabled()) {
    await inngest.send({
      name: EXTRACTION_EVENT,
      data,
    });
    logger.info("extraction.queued", data);
    return;
  }

  logger.warn("extraction.inline_fallback", data);
  const { runWorkOrderExtraction } = await import("@/services/shared/extraction.service");
  void runWorkOrderExtraction(data.documentId, data.extractionId).catch((error) => {
    if (error instanceof ExtractionQuotaError) {
      logger.warn("extraction.inline_quota", data);
      return;
    }
    logger.error("extraction.inline_failed", {
      ...data,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
