import { describe, expect, it } from "vitest";
import {
  isTerminalConfigured,
  mergePaymentTerminalConfig,
  parsePaymentTerminalConfig,
  sanitizePaymentTerminalConfig,
  SECRET_PLACEHOLDER,
} from "@/lib/shop/payment-terminal/settings";

describe("payment terminal settings", () => {
  it("parses paytm config", () => {
    const config = parsePaymentTerminalConfig({
      enabled: true,
      provider: "paytm",
      mid: "MID123",
      clientId: "client-1",
      merchantKey: "secret",
    });
    expect(config.provider).toBe("paytm");
    expect(config.enabled).toBe(true);
    expect(isTerminalConfigured(config)).toBe(true);
  });

  it("sanitizes secrets for client", () => {
    const publicConfig = sanitizePaymentTerminalConfig(
      parsePaymentTerminalConfig({
        enabled: true,
        provider: "paytm",
        mid: "MID123",
        merchantKey: "secret-key",
      })
    );
    expect(publicConfig).not.toHaveProperty("merchantKey");
    expect(publicConfig.hasMerchantKey).toBe(true);
  });

  it("preserves merchant key when placeholder sent on save", () => {
    const merged = mergePaymentTerminalConfig(
      parsePaymentTerminalConfig({
        enabled: true,
        provider: "paytm",
        merchantKey: "old-secret",
        hasMerchantKey: true,
      }),
      { merchantKey: SECRET_PLACEHOLDER }
    );
    expect(merged?.merchantKey).toBe("old-secret");
  });

  it("requires bridge url for generic provider", () => {
    expect(
      isTerminalConfigured(
        parsePaymentTerminalConfig({
          enabled: true,
          provider: "generic_bridge",
        })
      )
    ).toBe(false);
    expect(
      isTerminalConfigured(
        parsePaymentTerminalConfig({
          enabled: true,
          provider: "generic_bridge",
          bridgeUrl: "http://127.0.0.1:9100",
        })
      )
    ).toBe(true);
  });
});
