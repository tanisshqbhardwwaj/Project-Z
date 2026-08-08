import type { ExtractedField } from "./types";

const WO_NUMBER_PATTERNS = [
  /(?:work\s*order\s*(?:no\.?|number|#)?)\s*[:\-]?\s*([A-Z0-9/\-]+)/i,
  /(?:wo\s*(?:no\.?|#)?)\s*[:\-]?\s*([A-Z0-9/\-]+)/i,
  /(?:order\s*no\.?)\s*[:\-]?\s*([A-Z0-9/\-]+)/i,
];

const PROJECT_NAME_PATTERNS = [
  /(?:name\s*of\s*work|work\s*name|project\s*name|title\s*of\s*work)\s*[:\-]?\s*(.+)/i,
  /(?:description\s*of\s*work)\s*[:\-]?\s*(.+)/i,
];

const TIME_OF_COMPLETION_PATTERNS = [
  /(?:time\s*of\s*completion|period\s*of\s*completion|completion\s*period|duration)\s*[:\-]?\s*(\d+\s*(?:days?|weeks?|months?|years?))/i,
];

function cleanValue(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  return s || null;
}

function looksLikeWoNumber(value: string): boolean {
  return /^(wo[\s\-#/]?)?\d|^\d{4,}|^[A-Z]{2,}\/\d/i.test(value);
}

function looksLikeProjectName(value: string): boolean {
  if (looksLikeWoNumber(value)) return false;
  return value.length > 8 && /[a-zA-Z\s]{5,}/.test(value);
}

export function normalizeExtractedFields(fields: ExtractedField[]): ExtractedField[] {
  const map = new Map<string, ExtractedField>();
  for (const f of fields) {
    map.set(f.field, { ...f, value: cleanValue(f.value) });
  }

  let woNumber = cleanValue(map.get("workOrderNumber")?.value);
  let projectName = cleanValue(map.get("projectName")?.value);

  if (woNumber && projectName && woNumber === projectName) {
    projectName = null;
  }

  if (!woNumber || !looksLikeWoNumber(woNumber)) {
    for (const pattern of WO_NUMBER_PATTERNS) {
      const source = [woNumber, projectName, cleanValue(map.get("description")?.value)]
        .filter(Boolean)
        .join(" ");
      const m = source.match(pattern);
      if (m?.[1]) {
        woNumber = m[1].trim();
        break;
      }
    }
  }

  if (!projectName || looksLikeWoNumber(projectName) || projectName === woNumber) {
    for (const pattern of PROJECT_NAME_PATTERNS) {
      const source = cleanValue(map.get("description")?.value) ?? "";
      const m = source.match(pattern);
      if (m?.[1] && !looksLikeWoNumber(m[1])) {
        projectName = m[1].trim().slice(0, 200);
        break;
      }
    }
  }

  if (projectName && woNumber && projectName === woNumber) {
    projectName = null;
  }

  if (projectName && !looksLikeProjectName(projectName) && woNumber) {
    if (projectName.length < 10) projectName = null;
  }

  let timeOfCompletion = cleanValue(map.get("timeOfCompletion")?.value);
  if (!timeOfCompletion) {
    const searchText = [
      cleanValue(map.get("description")?.value),
      cleanValue(map.get("paymentTerms")?.value),
    ]
      .filter(Boolean)
      .join(" ");
    for (const pattern of TIME_OF_COMPLETION_PATTERNS) {
      const m = searchText.match(pattern);
      if (m?.[1]) {
        timeOfCompletion = m[1].trim();
        break;
      }
    }
  }

  const result: ExtractedField[] = [];
  for (const [field, f] of map) {
    if (field === "workOrderNumber" && woNumber) {
      result.push({ ...f, value: woNumber, confidence: Math.max(f.confidence, 0.7) });
    } else if (field === "projectName" && projectName) {
      result.push({ ...f, value: projectName, confidence: Math.max(f.confidence, 0.7) });
    } else if (field === "timeOfCompletion" && timeOfCompletion) {
      result.push({ ...f, value: timeOfCompletion, confidence: Math.max(f.confidence, 0.75) });
    } else if (field !== "clientContact") {
      result.push(f);
    }
  }

  if (timeOfCompletion && !result.some((f) => f.field === "timeOfCompletion")) {
    result.push({
      field: "timeOfCompletion",
      value: timeOfCompletion,
      confidence: 0.75,
      status: "pending",
    });
  }

  const tender =
    cleanValue(map.get("tenderAmount")?.value) ??
    cleanValue(map.get("contractAmount")?.value);
  if (tender) {
    const existing = result.find((f) => f.field === "tenderAmount");
    if (existing) {
      existing.value = tender.replace(/[,₹]/g, "");
    } else {
      result.push({
        field: "tenderAmount",
        value: tender.replace(/[,₹]/g, ""),
        confidence: 0.8,
        status: "pending",
      });
    }
  }

  return result.filter((f) => f.field !== "contractAmount");
}
