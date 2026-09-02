import { describe, expect, it } from "vitest";
import { pathnameToMarkdownFile, slugToPathname } from "@/lib/agent/markdown-routes";

describe("slugToPathname", () => {
  it("maps empty slug to root", () => {
    expect(slugToPathname(undefined)).toBe("/");
    expect(slugToPathname([])).toBe("/");
  });

  it("joins nested slugs", () => {
    expect(slugToPathname(["pricing", "compare"])).toBe("/pricing/compare");
  });
});

describe("pathnameToMarkdownFile", () => {
  it("maps known marketing paths to content filenames", () => {
    expect(pathnameToMarkdownFile("/")).toBe("index.md");
    expect(pathnameToMarkdownFile("/pricing")).toBe("pricing.md");
    expect(pathnameToMarkdownFile("/pricing/compare")).toBe("pricing-compare.md");
    expect(pathnameToMarkdownFile("/about")).toBe("about.md");
    expect(pathnameToMarkdownFile("/contact")).toBe("contact.md");
    expect(pathnameToMarkdownFile("/privacy")).toBe("privacy.md");
  });

  it("returns null for unknown paths", () => {
    expect(pathnameToMarkdownFile("/unknown")).toBeNull();
    expect(pathnameToMarkdownFile("/dashboard")).toBeNull();
  });
});
