import { afterEach, describe, expect, it } from "vitest";
import { getTestEmailAllowlist, isTestEmailAllowlisted } from "@/lib/email/test-allowlist";

describe("test email allowlist", () => {
  afterEach(() => {
    delete process.env.TEST_EMAIL_ALLOWLIST;
  });

  it("returns empty set when unset", () => {
    expect(getTestEmailAllowlist().size).toBe(0);
    expect(isTestEmailAllowlisted("a@b.com")).toBe(false);
  });

  it("matches emails case-insensitively", () => {
    process.env.TEST_EMAIL_ALLOWLIST =
      "tanishqbhardwaj03@gmail.com, gs9818860351@gmail.com";
    expect(isTestEmailAllowlisted("Tanishqbhardwaj03@gmail.com")).toBe(true);
    expect(isTestEmailAllowlisted("gs9818860351@gmail.com")).toBe(true);
    expect(isTestEmailAllowlisted("other@gmail.com")).toBe(false);
  });
});
