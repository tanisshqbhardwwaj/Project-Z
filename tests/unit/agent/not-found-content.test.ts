import { describe, expect, it } from "vitest";
import {
  createNotFoundResponse,
  NOT_FOUND_MARKDOWN,
  notFoundBody,
} from "@/lib/agent/not-found-content";

describe("not-found content", () => {
  it("markdown body links to llms.txt and sitemap", () => {
    expect(NOT_FOUND_MARKDOWN).toContain("/llms.txt");
    expect(NOT_FOUND_MARKDOWN).toContain("/sitemap.xml");
    expect(NOT_FOUND_MARKDOWN).toContain("[Home](/)");
  });

  it("returns markdown for Accept: text/markdown", () => {
    const body = notFoundBody("text/markdown");
    expect(body).toBe(NOT_FOUND_MARKDOWN);
  });

  it("returns HTML for default Accept", () => {
    const body = notFoundBody("text/html");
    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain("/llms.txt");
  });

  it("createNotFoundResponse has status 404", () => {
    const res = createNotFoundResponse("text/markdown");
    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("Vary")).toContain("Accept");
  });
});
