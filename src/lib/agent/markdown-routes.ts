import path from "node:path";

/** Maps URL pathname to markdown filename under content/marketing/. */
const PATH_TO_FILE: Record<string, string> = {
  "/": "index.md",
  "/pricing": "pricing.md",
  "/pricing/compare": "pricing-compare.md",
  "/about": "about.md",
  "/contact": "contact.md",
  "/privacy": "privacy.md",
};

export const MARKETING_CONTENT_DIR = path.join(process.cwd(), "content", "marketing");

export function pathnameToMarkdownFile(pathname: string): string | null {
  const normalized = pathname === "" ? "/" : pathname.replace(/\/$/, "") || "/";
  return PATH_TO_FILE[normalized] ?? null;
}

export function slugToPathname(slug: string[] | undefined): string {
  if (!slug || slug.length === 0) return "/";
  return `/${slug.join("/")}`;
}

export function resolveMarketingMarkdownPath(pathname: string): string | null {
  const fileName = pathnameToMarkdownFile(pathname);
  if (!fileName) return null;
  return path.join(MARKETING_CONTENT_DIR, fileName);
}
