import { EXTRACTION_EVENT, inngest, isInngestEnabled, type ExtractionEventData } from "@/inngest/client";
import { logger } from "@/lib/logger";
import { runWorkOrderExtraction } from "@/services/extraction.service";

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
  void runWorkOrderExtraction(data.documentId, data.extractionId).catch((error) => {
    logger.error("extraction.inline_failed", {
      ...data,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
