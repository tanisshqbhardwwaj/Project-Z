/** Parse "3 Months", "90 Days", "1 Year", "6 weeks" etc. into days. */
export function parseTimeOfCompletion(text: string | null | undefined): number | null {
  if (!text?.trim()) return null;
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ");

  const match = normalized.match(
    /^(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months|year|years|yr|yrs|mth|mths)$/
  );
  if (!match) {
    const loose = normalized.match(/(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months|year|years)/);
    if (!loose) return null;
    return unitToDays(parseFloat(loose[1]), loose[2]);
  }

  return unitToDays(parseFloat(match[1]), match[2]);
}

function unitToDays(value: number, unit: string): number {
  if (unit.startsWith("day")) return Math.round(value);
  if (unit.startsWith("week")) return Math.round(value * 7);
  if (unit.startsWith("month") || unit.startsWith("mth")) return Math.round(value * 30);
  if (unit.startsWith("year") || unit.startsWith("yr")) return Math.round(value * 365);
  return Math.round(value);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function calculateCompletionDate(input: {
  workOrderDate: Date;
  documentCompletionDate?: Date | null;
  timeOfCompletion?: string | null;
  durationDays?: number | null;
  orgDefaultDays?: number;
}): Date | null {
  if (input.documentCompletionDate) {
    return input.documentCompletionDate;
  }

  const fromText = parseTimeOfCompletion(input.timeOfCompletion);
  const days = fromText ?? input.durationDays ?? input.orgDefaultDays ?? 30;
  return addDays(input.workOrderDate, days);
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}
