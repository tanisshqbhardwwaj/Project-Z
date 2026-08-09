import { afterEach, describe, expect, it } from "vitest";
import { getTestEmailAllowlist, isTestEmailAllowlisted } from "@/lib/email/test-allowlist";

const BUILTIN_COUNT = 3;

describe("test email allowlist", () => {
  afterEach(() => {
    delete process.env.TEST_EMAIL_ALLOWLIST;
  });

  it("includes built-in beta emails without env", () => {
    expect(getTestEmailAllowlist().size).toBe(BUILTIN_COUNT);
    expect(isTestEmailAllowlisted("tanishqbhardwaj03@gmail.com")).toBe(true);
    expect(isTestEmailAllowlisted("gs9818860351@gmail.com")).toBe(true);
    expect(isTestEmailAllowlisted("a@b.com")).toBe(false);
  });

  it("merges env allowlist with built-in emails", () => {
    process.env.TEST_EMAIL_ALLOWLIST = "extra@test.com";
    expect(getTestEmailAllowlist().size).toBe(BUILTIN_COUNT + 1);
    expect(isTestEmailAllowlisted("extra@test.com")).toBe(true);
    expect(isTestEmailAllowlisted("tanishqbhardwaj03@gmail.com")).toBe(true);
    expect(isTestEmailAllowlisted("other@gmail.com")).toBe(false);
  });
});
