import { describe, expect, it } from "vitest";
import {
  isMarketingPath,
  isProtectedAppPath,
  isPublicPath,
  isUnknownPublicPath,
  stripMarkdownSuffix,
} from "@/lib/agent/site-routes";

describe("isPublicPath", () => {
  it("matches marketing and auth routes", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/pricing")).toBe(true);
    expect(isPublicPath("/about")).toBe(true);
    expect(isPublicPath("/contact")).toBe(true);
    expect(isPublicPath("/privacy")).toBe(true);
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/register")).toBe(true);
    expect(isPublicPath("/invite/abc")).toBe(true);
  });

  it("does not match app routes", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/shop/invoices")).toBe(false);
  });
});

describe("isProtectedAppPath", () => {
  it("matches known app prefixes", () => {
    expect(isProtectedAppPath("/dashboard")).toBe(true);
    expect(isProtectedAppPath("/shop/invoices")).toBe(true);
    expect(isProtectedAppPath("/ops/users")).toBe(true);
  });

  it("does not match public marketing paths", () => {
    expect(isProtectedAppPath("/pricing")).toBe(false);
    expect(isProtectedAppPath("/about")).toBe(false);
  });
});

describe("isUnknownPublicPath", () => {
  it("flags probe paths agents use", () => {
    expect(isUnknownPublicPath("/some-path-that-does-not-exist")).toBe(true);
    expect(isUnknownPublicPath("/random")).toBe(true);
  });

  it("does not flag public or protected paths", () => {
    expect(isUnknownPublicPath("/about")).toBe(false);
    expect(isUnknownPublicPath("/dashboard")).toBe(false);
    expect(isUnknownPublicPath("/login")).toBe(false);
  });

  it("does not flag markdown sibling URLs for public pages", () => {
    expect(isUnknownPublicPath("/pricing.md")).toBe(false);
    expect(isUnknownPublicPath("/about.md")).toBe(false);
  });
});

describe("isMarketingPath", () => {
  it("includes trust pages", () => {
    expect(isMarketingPath("/")).toBe(true);
    expect(isMarketingPath("/pricing/compare")).toBe(true);
    expect(isMarketingPath("/privacy")).toBe(true);
  });
});

describe("stripMarkdownSuffix", () => {
  it("strips .md from paths", () => {
    expect(stripMarkdownSuffix("/pricing.md")).toBe("/pricing");
    expect(stripMarkdownSuffix("/index.md")).toBe("/");
  });
});
