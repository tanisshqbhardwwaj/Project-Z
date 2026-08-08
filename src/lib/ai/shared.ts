import type { ExtractedField } from "./types";
import { WORK_ORDER_FIELDS } from "./types";
import { normalizeExtractedFields } from "./normalize-extraction";

export const EXTRACTION_PROMPT = `You are a document extraction assistant for Indian government and private work orders (CPWD, PWD, municipal contracts, etc.).

Extract ONLY these fields. Return valid JSON:
{
  "fields": [
    { "field": "workOrderNumber", "value": "...", "confidence": 0.95, "source": "page 1" }
  ]
}

CRITICAL RULES:
- workOrderNumber: The official Work Order / WO number ONLY (e.g. "WO-123/2024", "456789"). NOT file number, NOT project code, NOT tender ID.
- projectName: The full descriptive title/name of the work (e.g. "Painting of Building Block A"). NOT the WO number. Usually under "Name of Work", "Description of Work", or "Title".
- workOrderDate: Date the work order was issued (ISO YYYY-MM-DD).
- timeOfCompletion: Duration text exactly as written (e.g. "3 Months", "90 Days", "6 Months", "1 Year"). Look for "Time of Completion", "Period of Completion", "Duration".
- expectedCompletionDate: Only if an explicit end/completion date is stated (ISO YYYY-MM-DD). Do NOT guess from timeOfCompletion.
- clientName: Issuing department/client name.
- headOfAccount: Head of Account / H.O.A. / budget head code if present.
- projectLocation: Site/location of work.
- description: Brief scope of work if separate from projectName.
- tenderAmount: The TENDER AMOUNT / accepted bid / contract value in INR rupees as a number (no commas). This is the FINAL amount payable for the work — look for "Tender Amount", "Accepted Tender Amount", "Contract Value", "Work Order Value", "Amount of Work". Use the final awarded amount only, not estimates.
- paymentTerms: Payment terms text.

Use null for missing fields. Confidence 0-1. Dates in ISO YYYY-MM-DD.`;

export function emptyExtractionFields(): ExtractedField[] {
  return WORK_ORDER_FIELDS.map((field) => ({
    field,
    value: null,
    confidence: 0,
    status: "pending" as const,
  }));
}

export function parseExtractionResponse(text: string): ExtractedField[] {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const data = JSON.parse(jsonMatch[0]);
    const raw = (data.fields ?? []).map(
      (f: { field: string; value: unknown; confidence?: number; source?: string }) => ({
        field:
          f.field === "clientContact"
            ? "headOfAccount"
            : f.field === "contractAmount"
              ? "tenderAmount"
              : f.field,
        value: f.value as string | number | null,
        confidence: f.confidence ?? 0.5,
        source: f.source,
        status: "pending" as const,
      })
    );
    return normalizeExtractedFields(raw);
  } catch {
    return [];
  }
}

export function manualExtractionResult(
  provider: string,
  model: string,
  message: string
): { fields: ExtractedField[]; rawResponse: object; provider: string; model: string } {
  return {
    fields: emptyExtractionFields(),
    rawResponse: { manualFallback: true, message },
    provider,
    model,
  };
}
