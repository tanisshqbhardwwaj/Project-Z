export const PRODUCES = ["text/html", "text/markdown"] as const;

export type AcceptEntry = { type: string; q: number; specificity: number };

export function parseAccept(header: string): AcceptEntry[] {
  return header.split(",").map((raw) => {
    const parts = raw.trim().split(";").map((s) => s.trim());
    const type = parts[0].toLowerCase();
    let q = 1;
    for (const param of parts.slice(1)) {
      const [name, value] = param.split("=").map((s) => s.trim());
      if (name === "q") {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) q = Math.max(0, Math.min(1, parsed));
      }
    }
    const specificity = type === "*/*" ? 0 : type.endsWith("/*") ? 1 : 2;
    return { type, q, specificity };
  });
}

function matches(entry: AcceptEntry, candidate: string): boolean {
  if (entry.type === "*/*") return true;
  if (entry.type.endsWith("/*")) return candidate.startsWith(entry.type.slice(0, -1));
  return entry.type === candidate;
}

export function preferredType(header: string | null): string | null {
  if (!header) return PRODUCES[0];

  const entries = parseAccept(header);
  if (entries.length === 0) return PRODUCES[0];

  let bestType: string | null = null;
  let bestQ = -1;
  let bestPosition = Infinity;

  for (const candidate of PRODUCES) {
    let matched: AcceptEntry | null = null;
    let matchedPosition = Infinity;
    for (let idx = 0; idx < entries.length; idx++) {
      const entry = entries[idx];
      if (!matches(entry, candidate)) continue;
      if (
        matched === null ||
        entry.specificity > matched.specificity ||
        (entry.specificity === matched.specificity && idx < matchedPosition)
      ) {
        matched = entry;
        matchedPosition = idx;
      }
    }
    if (matched === null) continue;
    if (matched.q <= 0) continue;

    if (matched.q > bestQ || (matched.q === bestQ && matchedPosition < bestPosition)) {
      bestQ = matched.q;
      bestPosition = matchedPosition;
      bestType = candidate;
    }
  }

  return bestType;
}

export function appendVaryAccept(headers: Headers): void {
  const existing = headers.get("Vary");
  const tokens = existing
    ? existing.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const lower = new Set(tokens.map((t) => t.toLowerCase()));
  if (!lower.has("accept")) tokens.push("Accept");
  if (!lower.has("accept-encoding")) tokens.push("Accept-Encoding");
  headers.set("Vary", tokens.join(", "));
}

export function wantsMarkdown(header: string | null): boolean {
  return preferredType(header) === "text/markdown";
}
