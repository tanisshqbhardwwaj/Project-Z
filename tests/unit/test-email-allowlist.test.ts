import { afterEach, describe, expect, it } from "vitest";
import { isStaticTestEmailAllowlisted } from "@/services/beta-test-email.service";

const BUILTIN_COUNT = 4;

describe("test email allowlist", () => {
  afterEach(() => {
    delete process.env.TEST_EMAIL_ALLOWLIST;
  });

  it("includes built-in beta emails without env", () => {
    expect(isStaticTestEmailAllowlisted("tanishqbhardwaj03@gmail.com")).toBe(true);
    expect(isStaticTestEmailAllowlisted("gs9818860351@gmail.com")).toBe(true);
    expect(isStaticTestEmailAllowlisted("bhardwajanil50@yahoo.com")).toBe(true);
    expect(isStaticTestEmailAllowlisted("a@b.com")).toBe(false);
  });

  it("merges env allowlist with built-in emails", () => {
    process.env.TEST_EMAIL_ALLOWLIST = "extra@test.com";
    expect(isStaticTestEmailAllowlisted("extra@test.com")).toBe(true);
    expect(isStaticTestEmailAllowlisted("tanishqbhardwaj03@gmail.com")).toBe(true);
    expect(isStaticTestEmailAllowlisted("other@gmail.com")).toBe(false);
  });

  it("tracks four built-in addresses", () => {
    const builtins = [
      "tanishqbhardwaj03@gmail.com",
      "gs9818860351@gmail.com",
      "tanishqbhardwaj457@gmail.com",
      "bhardwajanil50@yahoo.com",
    ];
    expect(builtins.filter((e) => isStaticTestEmailAllowlisted(e))).toHaveLength(BUILTIN_COUNT);
  });
});
