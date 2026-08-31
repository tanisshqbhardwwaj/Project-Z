import { afterEach, describe, expect, it } from "vitest";
import { isStaticTestEmailAllowlisted } from "@/services/beta-test-email.service";

describe("test email allowlist", () => {
  afterEach(() => {
    delete process.env.TEST_EMAIL_ALLOWLIST;
  });

  it("is empty without env allowlist", () => {
    expect(isStaticTestEmailAllowlisted("tanishqbhardwaj03@gmail.com")).toBe(false);
    expect(isStaticTestEmailAllowlisted("a@b.com")).toBe(false);
  });

  it("uses TEST_EMAIL_ALLOWLIST env when set", () => {
    process.env.TEST_EMAIL_ALLOWLIST = "extra@test.com,friend@gmail.com";
    expect(isStaticTestEmailAllowlisted("extra@test.com")).toBe(true);
    expect(isStaticTestEmailAllowlisted("friend@gmail.com")).toBe(true);
    expect(isStaticTestEmailAllowlisted("other@gmail.com")).toBe(false);
  });

  it("normalizes email case and whitespace", () => {
    process.env.TEST_EMAIL_ALLOWLIST = " Friend@Gmail.com ";
    expect(isStaticTestEmailAllowlisted("friend@gmail.com")).toBe(true);
  });
});
