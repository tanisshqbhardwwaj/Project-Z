import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DocumentParser } from "../document-parser";
import type { ExtractInput, ExtractionResult } from "../types";
import {
  EXTRACTION_PROMPT,
  emptyExtractionFields,
  manualExtractionResult,
  parseExtractionResponse,
} from "../shared";

/** Models to try in order (free-tier friendly first). Override with GEMINI_MODEL. */
export const GEMINI_MODEL_FALLBACKS = [
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash-8b",
] as const;

export const DEFAULT_GEMINI_MODEL = GEMINI_MODEL_FALLBACKS[0];

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function getModelsToTry(): string[] {
  const primary = getGeminiModel();
  const rest = GEMINI_MODEL_FALLBACKS.filter((m) => m !== primary);
  return [primary, ...rest];
}

export { emptyExtractionFields };

function isQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("429") || msg.includes("quota") || msg.includes("Quota exceeded");
}

function parseRetrySeconds(error: unknown): number {
  const msg = error instanceof Error ? error.message : String(error);
  const match = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (match) return Math.ceil(parseFloat(match[1])) + 1;
  return 60;
}

function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export class GeminiParser implements DocumentParser {
  async extract(input: ExtractInput): Promise<ExtractionResult> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return manualExtractionResult(
        "gemini",
        getGeminiModel(),
        "No GEMINI_API_KEY — fill fields manually."
      );
    }

    if (!apiKey.startsWith("AIza")) {
      console.warn(
        "[GEMINI] API key format looks unusual. Use a key from https://aistudio.google.com/apikey (starts with AIzaSy...)"
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const models = getModelsToTry();
    let lastError: unknown;

    for (const modelName of models) {
      try {
        const result = await this.extractWithModel(genAI, modelName, input);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`[GEMINI] Model ${modelName} failed:`, error instanceof Error ? error.message : error);

        if (isQuotaError(error)) {
          const wait = parseRetrySeconds(error);
          if (wait <= 120) {
            console.log(`[GEMINI] Quota hit, waiting ${wait}s before next model...`);
            await sleep(Math.min(wait, 60));
          }
          continue;
        }
      }
    }

    if (isQuotaError(lastError)) {
      return manualExtractionResult(
        "gemini",
        getGeminiModel(),
        "Google AI free quota exceeded. Wait ~1 minute and retry, or fill fields manually below. Get a key at https://aistudio.google.com/apikey"
      );
    }

    const message =
      lastError instanceof Error ? lastError.message : "AI extraction failed";
    return manualExtractionResult(
      "gemini",
      getGeminiModel(),
      `${message}. Fill in the fields manually below.`
    );
  }

  private async extractWithModel(
    genAI: GoogleGenerativeAI,
    modelName: string,
    input: ExtractInput
  ): Promise<ExtractionResult> {
    const model = genAI.getGenerativeModel({ model: modelName });
    const base64 = input.buffer.toString("base64");

    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      {
        inlineData: {
          mimeType: input.mimeType,
          data: base64,
        },
      },
    ]);

    const text = result.response.text();
    const parsed = parseExtractionResponse(text);

    return {
      fields: parsed.length > 0 ? parsed : emptyExtractionFields(),
      rawResponse: { text, parsed },
      provider: "gemini",
      model: modelName,
    };
  }
}
