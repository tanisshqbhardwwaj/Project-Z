import { existsSync } from "node:fs";
import path from "node:path";
import {
  ANDROID_APK_DOWNLOAD_NAME,
  ANDROID_APK_PATH,
  DEFAULT_CONTACT_EMAIL,
  WINDOWS_SETUP_DOWNLOAD_NAME,
  WINDOWS_SETUP_PATH,
} from "@/lib/brand/constants";
import { billingContact } from "@/lib/billing/plans";

function trimOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toWhatsAppUrl(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

function toTelUrl(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const e164 = digits.length === 10 ? `91${digits}` : digits;
  return `tel:+${e164}`;
}

function toMailto(raw: string | null): string | null {
  if (!raw || !raw.includes("@")) return null;
  return `mailto:${raw}`;
}

function inferEmailFromText(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return match ? match[0] : null;
}

function resolveContactEmail(fallback: string): string {
  const fromEnv = trimOrNull(process.env.NEXT_PUBLIC_BILLING_EMAIL);
  if (fromEnv && fromEnv.includes("@")) return fromEnv;
  return inferEmailFromText(fallback) ?? DEFAULT_CONTACT_EMAIL;
}

/** Shipped via git in public/downloads/ — use CDN path (existsSync fails in Vercel serverless). */
const COMMITTED_DOWNLOADS = new Set([
  ANDROID_APK_PATH,
  WINDOWS_SETUP_PATH,
  // legacy internal names (kept so old deploys still resolve)
  "project-z.apk",
  "project-z-setup.exe",
]);

const LEGACY_DOWNLOAD_ALIASES: Record<string, string> = {
  "project-z.apk": ANDROID_APK_PATH,
  "project-z-setup.exe": WINDOWS_SETUP_PATH,
};

function publicFileUrl(filename: string, envUrl: string | null): string | null {
  if (envUrl) return envUrl;
  if (COMMITTED_DOWNLOADS.has(filename)) return `/downloads/${filename}`;
  const filePath = path.join(process.cwd(), "public", "downloads", filename);
  if (existsSync(filePath)) return `/downloads/${filename}`;
  const legacy = LEGACY_DOWNLOAD_ALIASES[filename];
  if (legacy && COMMITTED_DOWNLOADS.has(legacy)) return `/downloads/${legacy}`;
  return null;
}

export type PublicMarketingConfig = {
  whatsappDisplay: string | null;
  whatsappUrl: string | null;
  phoneDisplay: string | null;
  phoneUrl: string | null;
  email: string | null;
  emailUrl: string | null;
  billingFallback: string;
  androidApkUrl: string | null;
  androidApkDownloadName: string;
  windowsDownloadUrl: string | null;
  windowsDownloadName: string;
};

export function getPublicMarketingConfig(): PublicMarketingConfig {
  const fallback = billingContact();
  const whatsapp = trimOrNull(process.env.NEXT_PUBLIC_WHATSAPP);
  const phone = trimOrNull(process.env.NEXT_PUBLIC_PHONE);
  const email = resolveContactEmail(fallback);

  return {
    whatsappDisplay: whatsapp,
    whatsappUrl: toWhatsAppUrl(whatsapp),
    phoneDisplay: phone,
    phoneUrl: toTelUrl(phone),
    email,
    emailUrl: toMailto(email),
    billingFallback: fallback,
    androidApkUrl: publicFileUrl(
      ANDROID_APK_PATH,
      trimOrNull(process.env.NEXT_PUBLIC_ANDROID_APK_URL)
    ),
    androidApkDownloadName: ANDROID_APK_DOWNLOAD_NAME,
    windowsDownloadUrl: publicFileUrl(
      WINDOWS_SETUP_PATH,
      trimOrNull(process.env.NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL)
    ),
    windowsDownloadName: WINDOWS_SETUP_DOWNLOAD_NAME,
  };
}
