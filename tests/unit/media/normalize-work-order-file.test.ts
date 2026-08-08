import { describe, expect, it } from "vitest";
import { isHeicFile } from "@/lib/media/normalize-work-order-file";

describe("work order upload normalization", () => {
  it("detects HEIC files by extension", () => {
    expect(isHeicFile("photo.HEIC", "")).toBe(true);
    expect(isHeicFile("photo.heif", "")).toBe(true);
  });

  it("detects HEIC files by mime type", () => {
    expect(isHeicFile("upload", "image/heic")).toBe(true);
  });

  it("ignores regular jpeg uploads", () => {
    expect(isHeicFile("scan.jpg", "image/jpeg")).toBe(false);
  });
});
