/** Vitest stub for Next.js server APIs used transitively by next-auth. */

export class NextResponse {
  static json(body: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers as Record<string, string>) },
    });
  }

  static redirect(url: string | URL, init?: number | ResponseInit) {
    const status = typeof init === "number" ? init : init?.status ?? 307;
    return new Response(null, { status, headers: { location: String(url) } });
  }
}

export function headers() {
  return new Headers();
}

export function cookies() {
  return {
    get: () => undefined,
    set: () => undefined,
    delete: () => undefined,
    has: () => false,
    getAll: () => [] as { name: string; value: string }[],
  };
}

export type NextRequest = Request;
