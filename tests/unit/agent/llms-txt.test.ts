import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildLlmsTxt } from "@/lib/agent/llms-txt";
import { DEFAULT_PRODUCTION_APP_URL } from "@/lib/brand/constants";

describe("buildLlmsTxt", () => {
  it("follows llmstxt.org v2 structure", () => {
    const content = buildLlmsTxt();
    expect(content.startsWith("# ")).toBe(true);
    expect(content).toContain("> ");
    expect(content).toContain("## When to use this product");
    expect(content).toContain("## Public pages");
    expect(content).toContain(DEFAULT_PRODUCTION_APP_URL);
    expect(content).toContain(".md");
    expect(content).toContain("GST retail POS");
  });

  it("matches committed public/llms.txt", () => {
    const generated = buildLlmsTxt();
    const onDisk = readFileSync(path.join(process.cwd(), "public", "llms.txt"), "utf8");
    expect(onDisk).toBe(generated);
  });
});
