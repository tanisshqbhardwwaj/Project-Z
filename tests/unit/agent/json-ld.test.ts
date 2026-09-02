import { describe, expect, it } from "vitest";
import { buildMarketingJsonLd } from "@/lib/agent/json-ld";
import { DEFAULT_PRODUCTION_APP_URL } from "@/lib/brand/constants";

describe("buildMarketingJsonLd", () => {
  it("includes Organization and SoftwareApplication nodes", () => {
    const jsonLd = buildMarketingJsonLd();
    const graph = jsonLd["@graph"] as Array<Record<string, unknown>>;

    const org = graph.find((n) => n["@type"] === "Organization");
    const app = graph.find((n) => n["@type"] === "SoftwareApplication");

    expect(org).toBeDefined();
    expect(app).toBeDefined();
    expect(org!.name).toBe("E-console");
    expect(org!.url).toBe(DEFAULT_PRODUCTION_APP_URL);
    expect(org!.alternateName).toContain("econsole.in");

    expect(app!.name).toBe("BusinessOS");
    expect(app!.applicationCategory).toBe("BusinessApplication");
    expect((app!.offers as { url: string }).url).toBe(`${DEFAULT_PRODUCTION_APP_URL}/pricing`);
  });
});
