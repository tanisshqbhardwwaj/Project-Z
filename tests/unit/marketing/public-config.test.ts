import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_CONTACT_EMAIL } from "@/lib/brand/constants";
import { getPublicMarketingConfig } from "@/lib/marketing/public-config";

const KEYS = [
  "NEXT_PUBLIC_WHATSAPP",
  "NEXT_PUBLIC_PHONE",
  "NEXT_PUBLIC_BILLING_EMAIL",
  "NEXT_PUBLIC_ANDROID_APK_URL",
  "NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL",
  "BILLING_CONTACT",
] as const;

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

describe("getPublicMarketingConfig", () => {
  it("builds wa.me, tel, and mailto links", () => {
    process.env.NEXT_PUBLIC_WHATSAPP = "9876543210";
    process.env.NEXT_PUBLIC_PHONE = "+91 98765 43210";
    process.env.NEXT_PUBLIC_BILLING_EMAIL = "hello@example.com";
    process.env.NEXT_PUBLIC_ANDROID_APK_URL = "https://example.com/app.apk";

    const config = getPublicMarketingConfig();
    expect(config.whatsappUrl).toBe("https://wa.me/919876543210");
    expect(config.phoneUrl).toBe("tel:+919876543210");
    expect(config.emailUrl).toBe("mailto:hello@example.com");
    expect(config.androidApkUrl).toBe("https://example.com/app.apk");
    expect(config.windowsDownloadUrl).toBe("/downloads/businessos-setup.exe");
  });

  it("returns committed apk path without filesystem checks", () => {
    const config = getPublicMarketingConfig();
    expect(config.androidApkUrl).toBe("/downloads/businessos.apk");
    expect(config.androidApkDownloadName).toBe("BusinessOS.apk");
    expect(config.windowsDownloadName).toBe("BusinessOS-Setup.exe");
  });

  it("defaults to admin@econsole.in when contact env vars are empty", () => {
    const config = getPublicMarketingConfig();
    expect(config.email).toBe(DEFAULT_CONTACT_EMAIL);
    expect(config.emailUrl).toBe(`mailto:${DEFAULT_CONTACT_EMAIL}`);
    expect(config.phoneUrl).toBeNull();
    expect(config.whatsappUrl).toBeNull();
  });

  it("ignores incomplete contact values", () => {
    process.env.BILLING_CONTACT = "Contact support";
    process.env.NEXT_PUBLIC_WHATSAPP = "123";
    process.env.NEXT_PUBLIC_BILLING_EMAIL = "not-an-email";
    const config = getPublicMarketingConfig();
    expect(config.whatsappUrl).toBeNull();
    expect(config.email).toBe(DEFAULT_CONTACT_EMAIL);
    expect(config.emailUrl).toBe(`mailto:${DEFAULT_CONTACT_EMAIL}`);
  });

  it("uses email from BILLING_CONTACT when it contains an address", () => {
    process.env.BILLING_CONTACT = "Reach us at billing@econsole.in for plans";
    const config = getPublicMarketingConfig();
    expect(config.email).toBe("billing@econsole.in");
    expect(config.emailUrl).toBe("mailto:billing@econsole.in");
    expect(config.phoneUrl).toBeNull();
  });
});
