import { describe, expect, it } from "vitest";
import {
  marketingMetadataBase,
  marketingPageMetadata,
  sharedMarketingOpenGraph,
} from "@/lib/agent/marketing-metadata";
import { DEFAULT_PRODUCTION_APP_URL, ECONSOLE_LOGO_PATH } from "@/lib/brand/constants";

describe("marketing metadata", () => {
  it("uses production URL as metadataBase", () => {
    expect(marketingMetadataBase.toString()).toBe(`${DEFAULT_PRODUCTION_APP_URL}/`);
  });

  it("includes og:type and og:image in shared openGraph", () => {
    const og = sharedMarketingOpenGraph as {
      type?: string;
      images?: Array<{ url?: string | URL }>;
    };
    expect(og.type).toBe("website");
    const images = Array.isArray(og.images) ? og.images : og.images ? [og.images] : [];
    expect(images[0]?.url).toBe(ECONSOLE_LOGO_PATH);
  });

  it("builds canonical and markdown alternates per page", () => {
    const meta = marketingPageMetadata({
      title: "About",
      description: "About E-console",
      path: "/about",
    });
    expect(meta.alternates?.canonical).toBe("/about");
    expect(meta.alternates?.types?.["text/markdown"]).toBe("/about.md");
    expect(meta.openGraph?.url).toBe("/about");
  });

  it("uses /index.md for homepage markdown alternate", () => {
    const meta = marketingPageMetadata({
      title: "Home",
      description: "Homepage",
      path: "/",
      markdownPath: "/index.md",
    });
    expect(meta.alternates?.types?.["text/markdown"]).toBe("/index.md");
  });
});
