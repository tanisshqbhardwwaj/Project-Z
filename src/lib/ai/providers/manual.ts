import type { DocumentParser } from "../document-parser";
import type { ExtractInput, ExtractionResult } from "../types";
import { manualExtractionResult } from "../shared";

/** Zero-cost provider — upload works, user fills all fields manually. No API key needed. */
export class ManualParser implements DocumentParser {
  async extract(_input: ExtractInput): Promise<ExtractionResult> {
    return manualExtractionResult(
      "manual",
      "none",
      "Manual mode — no AI key configured. Fill in the fields below and click Create Project."
    );
  }
}
