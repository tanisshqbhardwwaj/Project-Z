import type { DocumentParser } from "../document-parser";
import type { ExtractInput, ExtractionResult } from "../types";
import { EXTRACTION_PROMPT, manualExtractionResult, parseExtractionResponse } from "../shared";
import { isServerlessRuntime } from "../serverless";

/** Groq text models (vision models were decommissioned on free tier for many accounts). */
export const GROQ_TEXT_MODEL =
  process.env.GROQ_TEXT_MODEL?.trim() || "llama-3.3-70b-versatile";

/** Optional vision model — only used if explicitly set and your Groq account supports it. */
export const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL?.trim() || "";

const IMAGE_MANUAL_MESSAGE =
  "Could not extract from this image automatically. Fill in the fields below or upload a PDF.";

function isImageMime(mimeType: string) {
  return mimeType.startsWith("image/");
}

async function groqChat(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: unknown }>
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = await import("pdf-parse");
  const parse = "default" in pdfParse ? pdfParse.default : pdfParse;
  const result = await (parse as (buf: Buffer) => Promise<{ text?: string }>)(buffer);
  return result.text?.trim() ?? "";
}

/** Local dev only — Tesseract crashes on Vercel serverless. */
async function extractImageTextLocal(buffer: Buffer): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(buffer);
    return data.text?.trim() ?? "";
  } finally {
    await worker.terminate();
  }
}

async function extractWithVisionModel(
  apiKey: string,
  model: string,
  input: ExtractInput
): Promise<string> {
  const dataUrl = `data:${input.mimeType};base64,${input.buffer.toString("base64")}`;
  return groqChat(apiKey, model, [
    {
      role: "user",
      content: [
        { type: "text", text: EXTRACTION_PROMPT },
        { type: "image_url", image_url: { url: dataUrl } },
      ],
    },
  ]);
}

async function extractFromDocumentText(apiKey: string, documentText: string): Promise<string> {
  return groqChat(apiKey, GROQ_TEXT_MODEL, [
    {
      role: "user",
      content: `${EXTRACTION_PROMPT}\n\nDocument text:\n${documentText.slice(0, 12000)}`,
    },
  ]);
}

async function extractFromImage(apiKey: string, input: ExtractInput): Promise<{ text: string; model: string }> {
  if (GROQ_VISION_MODEL) {
    try {
      const text = await extractWithVisionModel(apiKey, GROQ_VISION_MODEL, input);
      return { text, model: GROQ_VISION_MODEL };
    } catch (visionError) {
      console.warn("[GROQ] Vision model failed:", visionError);
      if (isServerlessRuntime()) {
        throw visionError;
      }
    }
  }

  if (isServerlessRuntime()) {
    throw new Error(IMAGE_MANUAL_MESSAGE);
  }

  const ocrText = await extractImageTextLocal(input.buffer);
  if (!ocrText) {
    throw new Error(IMAGE_MANUAL_MESSAGE);
  }
  const text = await extractFromDocumentText(apiKey, ocrText);
  return { text, model: GROQ_TEXT_MODEL };
}

/** Free tier at https://console.groq.com — no credit card required. */
export class GroqParser implements DocumentParser {
  async extract(input: ExtractInput): Promise<ExtractionResult> {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      return manualExtractionResult(
        "groq",
        GROQ_TEXT_MODEL,
        "Add GROQ_API_KEY (free at https://console.groq.com) or set AI_PROVIDER=manual."
      );
    }

    try {
      let text: string;
      let model = GROQ_TEXT_MODEL;

      if (isImageMime(input.mimeType)) {
        try {
          const imageResult = await extractFromImage(apiKey, input);
          text = imageResult.text;
          model = imageResult.model;
        } catch (imageError) {
          const message =
            imageError instanceof Error ? imageError.message : IMAGE_MANUAL_MESSAGE;
          return manualExtractionResult("groq", GROQ_TEXT_MODEL, message);
        }
      } else if (input.mimeType === "application/pdf") {
        const pdfText = await extractPdfText(input.buffer);
        if (!pdfText) {
          return manualExtractionResult(
            "groq",
            GROQ_TEXT_MODEL,
            "Could not read text from this PDF. Fill in the fields below or try a clearer scan."
          );
        }
        text = await extractFromDocumentText(apiKey, pdfText);
      } else {
        return manualExtractionResult(
          "groq",
          GROQ_TEXT_MODEL,
          "Unsupported file type. Use PDF, JPG, or PNG."
        );
      }

      const fields = parseExtractionResponse(text);
      return {
        fields: fields.length > 0 ? fields : manualExtractionResult("groq", model, "").fields,
        rawResponse: { text, model },
        provider: "groq",
        model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Groq extraction failed";
      const isRateLimit = message.includes("429") || message.includes("rate_limit");

      return manualExtractionResult(
        "groq",
        GROQ_TEXT_MODEL,
        isRateLimit
          ? "Groq free rate limit hit — wait a minute and click Re-run AI, or fill fields manually."
          : `${message}. Fill fields manually below.`
      );
    }
  }
}
