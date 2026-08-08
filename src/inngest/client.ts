import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "project-z",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export const EXTRACTION_EVENT = "work-order/extraction.requested" as const;

export type ExtractionEventData = {
  documentId: string;
  extractionId: string;
};

export function isInngestEnabled(): boolean {
  return Boolean(process.env.INNGEST_EVENT_KEY?.trim() || process.env.INNGEST_SIGNING_KEY?.trim());
}
