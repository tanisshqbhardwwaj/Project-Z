import { describe, expect, it } from "vitest";
import {
  appendVaryAccept,
  parseAccept,
  preferredType,
  PRODUCES,
} from "@/lib/agent/accept-negotiation";

describe("parseAccept", () => {
  it("parses q-values", () => {
    const entries = parseAccept("text/html;q=0.5, text/markdown;q=1");
    expect(entries[0].type).toBe("text/html");
    expect(entries[0].q).toBe(0.5);
    expect(entries[1].type).toBe("text/markdown");
    expect(entries[1].q).toBe(1);
  });

  it("assigns specificity for wildcards", () => {
    const entries = parseAccept("*/*, text/*, text/html");
    expect(entries[0].specificity).toBe(0);
    expect(entries[1].specificity).toBe(1);
    expect(entries[2].specificity).toBe(2);
  });
});

describe("preferredType", () => {
  it("defaults to text/html when Accept is missing", () => {
    expect(preferredType(null)).toBe("text/html");
  });

  it("prefers text/markdown when listed first", () => {
    expect(preferredType("text/markdown, text/html, */*")).toBe("text/markdown");
  });

  it("rejects text/html when q=0 even with */*;q=1", () => {
    expect(preferredType("text/html;q=0, */*;q=1")).toBe("text/markdown");
  });

  it("returns null when all produced types are rejected", () => {
    expect(preferredType("text/html;q=0, text/markdown;q=0")).toBeNull();
  });

  it("only considers PRODUCES types", () => {
    expect(PRODUCES).toEqual(["text/html", "text/markdown"]);
    expect(preferredType("application/pdf")).toBeNull();
  });
});

describe("appendVaryAccept", () => {
  it("sets Vary when missing", () => {
    const headers = new Headers();
    appendVaryAccept(headers);
    expect(headers.get("Vary")).toBe("Accept, Accept-Encoding");
  });

  it("merges Accept into existing Vary", () => {
    const headers = new Headers({ Vary: "Origin" });
    appendVaryAccept(headers);
    const vary = headers.get("Vary")!.toLowerCase();
    expect(vary).toContain("accept");
    expect(vary).toContain("origin");
  });

  it("does not duplicate accept token", () => {
    const headers = new Headers({ Vary: "Accept, Accept-Encoding" });
    appendVaryAccept(headers);
    const tokens = headers.get("Vary")!.split(",").map((s) => s.trim().toLowerCase());
    expect(tokens.filter((t) => t === "accept")).toHaveLength(1);
  });
});
