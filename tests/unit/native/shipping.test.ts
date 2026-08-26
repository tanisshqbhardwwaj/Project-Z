import { describe, expect, it } from "vitest";
import { capacitorNetworkFlags, APP_CONTENT_SECURITY_POLICY } from "@/lib/security/csp";
import { parseShopDiskSnapshot } from "@/lib/local-db/snapshot";

describe("Android shipping network flags", () => {
  it("requires https for a remote WebView URL", () => {
    expect(() =>
      capacitorNetworkFlags({ CAPACITOR_SERVER_URL: "http://192.168.1.10:3000" })
    ).toThrow(/https/);
  });

  it("allows http only with an explicit debug flag", () => {
    const flags = capacitorNetworkFlags({
      CAPACITOR_SERVER_URL: "http://192.168.1.10:3000",
      CAPACITOR_ALLOW_CLEARTEXT: "true",
    });
    expect(flags.cleartext).toBe(true);
    expect(flags.allowMixedContent).toBe(false);
  });

  it("uses https with mixed content off", () => {
    const flags = capacitorNetworkFlags({
      CAPACITOR_SERVER_URL: "https://app.example.com",
    });
    expect(flags.cleartext).toBe(false);
    expect(flags.allowMixedContent).toBe(false);
    expect(flags.url).toBe("https://app.example.com");
  });
});

describe("CSP", () => {
  it("includes frame-ancestors none and ipc for Tauri", () => {
    expect(APP_CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(APP_CONTENT_SECURITY_POLICY).toContain("ipc:");
  });
});

describe("desktop encrypted snapshot", () => {
  it("rejects junk and accepts versioned JSON", () => {
    expect(parseShopDiskSnapshot("not-json")).toBeNull();
    expect(
      parseShopDiskSnapshot(
        JSON.stringify({
          version: 1,
          orgId: "org-1",
          exportedAt: "",
          meta: null,
          outbox: [],
          kv: {},
        })
      )?.orgId
    ).toBe("org-1");
  });
});
