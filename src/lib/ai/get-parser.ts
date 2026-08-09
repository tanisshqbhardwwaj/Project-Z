import type { DocumentParser } from "./document-parser";
import { GeminiParser, getGeminiModel } from "./providers/gemini";
import { GroqParser } from "./providers/groq";
import { ManualParser } from "./providers/manual";

export { getGeminiModel };

export function getDefaultAiModel(): string {
  const provider = (process.env.AI_PROVIDER ?? "manual").toLowerCase();
  switch (provider) {
    case "groq":
      return process.env.GROQ_TEXT_MODEL?.trim() || "llama-3.3-70b-versatile";
    case "gemini":
      return getGeminiModel();
    default:
      return "none";
  }
}

function resolveProvider(provider?: string): string {
  const explicit = (provider ?? process.env.AI_PROVIDER ?? "").toLowerCase();
  if (explicit === "manual") return "manual";
  if (explicit === "groq" || explicit === "gemini") return explicit;
  if (process.env.GROQ_API_KEY?.trim()) return "groq";
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  return "manual";
}

export function getParser(provider?: string): DocumentParser {
  const p = resolveProvider(provider);

  switch (p) {
    case "groq":
      return new GroqParser();
    case "gemini":
      return new GeminiParser();
    case "manual":
    default:
      return new ManualParser();
  }
}
