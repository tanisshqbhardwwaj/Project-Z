import { DEFAULT_PRODUCTION_APP_URL, PRODUCT_BY_COMPANY } from "@/lib/brand/constants";
import { wantsMarkdown } from "@/lib/agent/accept-negotiation";

export const NOT_FOUND_MARKDOWN = `# Not Found

This path does not exist on ${DEFAULT_PRODUCTION_APP_URL}.

${PRODUCT_BY_COMPANY} is an all-in-one business management platform for Indian shops and service businesses.

## Helpful links

- [llms.txt](/llms.txt) — agent documentation index
- [Sitemap](/sitemap.xml) — public pages
- [Home](/) — product overview
- [Pricing](/pricing) — plans and contact
`;

export const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Not Found · E-console</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1.5rem; color: #0f172a; line-height: 1.6; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #475569; }
    ul { padding-left: 1.25rem; }
    a { color: #1e40af; }
  </style>
</head>
<body>
  <h1>Page not found</h1>
  <p>This path does not exist on <a href="${DEFAULT_PRODUCTION_APP_URL}">econsole.in</a>.</p>
  <ul>
    <li><a href="/llms.txt">llms.txt</a> — agent documentation index</li>
    <li><a href="/sitemap.xml">Sitemap</a> — public pages</li>
    <li><a href="/">Home</a> — ${PRODUCT_BY_COMPANY}</li>
    <li><a href="/pricing">Pricing</a> — plans and contact</li>
  </ul>
</body>
</html>`;

export function notFoundResponseHeaders(acceptHeader: string | null): Headers {
  const headers = new Headers();
  if (wantsMarkdown(acceptHeader)) {
    headers.set("Content-Type", "text/markdown; charset=utf-8");
  } else {
    headers.set("Content-Type", "text/html; charset=utf-8");
  }
  headers.set("Vary", "Accept, Accept-Encoding");
  return headers;
}

export function notFoundBody(acceptHeader: string | null): string {
  return wantsMarkdown(acceptHeader) ? NOT_FOUND_MARKDOWN : NOT_FOUND_HTML;
}

export function createNotFoundResponse(acceptHeader: string | null): Response {
  return new Response(notFoundBody(acceptHeader), {
    status: 404,
    headers: notFoundResponseHeaders(acceptHeader),
  });
}
