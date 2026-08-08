export interface ExtractedField {
  field: string;
  value: string | number | null;
  confidence: number;
  source?: string;
  status: "pending" | "accepted" | "rejected" | "edited";
}

export interface ExtractInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export interface ExtractionResult {
  fields: ExtractedField[];
  rawResponse: unknown;
  provider: string;
  model: string;
}

export const WORK_ORDER_FIELDS = [
  "workOrderNumber",
  "workOrderDate",
  "timeOfCompletion",
  "expectedCompletionDate",
  "clientName",
  "headOfAccount",
  "projectName",
  "projectLocation",
  "description",
  "tenderAmount",
  "paymentTerms",
] as const;
