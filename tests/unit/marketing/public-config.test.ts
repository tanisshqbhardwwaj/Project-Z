import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
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
    const localWin = path.join(process.cwd(), "public", "downloads", "project-z-setup.exe");
    expect(config.windowsDownloadUrl).toBe(
      existsSync(localWin) ? "/downloads/project-z-setup.exe" : null
    );
  });

  it("ignores incomplete contact values", () => {
    process.env.BILLING_CONTACT = "Contact support";
    process.env.NEXT_PUBLIC_WHATSAPP = "123";
    process.env.NEXT_PUBLIC_BILLING_EMAIL = "not-an-email";
    const config = getPublicMarketingConfig();
    expect(config.whatsappUrl).toBeNull();
    expect(config.emailUrl).toBeNull();
  });

  it("uses a phone number from BILLING_CONTACT when dedicated env vars are empty", () => {
    process.env.BILLING_CONTACT = "Call/WhatsApp 8929232078 or UPI merchant@bank";
    const config = getPublicMarketingConfig();
    expect(config.whatsappUrl).toBe("https://wa.me/918929232078");
    expect(config.phoneUrl).toBe("tel:+918929232078");
  });
});
