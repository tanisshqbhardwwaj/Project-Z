import type { ExtractedField, ExtractionResult, ExtractInput } from "./types";

export interface DocumentParser {
  extract(input: ExtractInput): Promise<ExtractionResult>;
}

export type { ExtractedField, ExtractionResult, ExtractInput };
