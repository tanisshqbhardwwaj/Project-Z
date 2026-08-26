/** Build a cursor-paginated list API URL. */
export function buildCursorListUrl(
  path: string,
  params: Record<string, string | number | undefined | null>,
  cursor?: string
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  if (cursor) search.set("cursor", cursor);
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}
