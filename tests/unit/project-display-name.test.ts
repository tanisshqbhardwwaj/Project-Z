import { describe, expect, it } from "vitest";
import { getProjectDisplayName, getProjectSubtitle } from "@/lib/project/display-name";

describe("project display name", () => {
  it("uses nickname when set", () => {
    expect(getProjectDisplayName({ nickname: "Block A", name: "Long official name" })).toBe(
      "Block A"
    );
  });

  it("falls back to full name", () => {
    expect(getProjectDisplayName({ nickname: null, name: "Full name" })).toBe("Full name");
  });

  it("shows subtitle when nickname differs from name", () => {
    expect(getProjectSubtitle({ nickname: "Block A", name: "Long name" })).toBe("Long name");
    expect(getProjectSubtitle({ nickname: null, name: "Long name" })).toBeNull();
  });
});
