import { existsSync } from "node:fs";
import path from "node:path";
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

function inferPhoneFromText(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(/(?:\+?91[\s-]?)?[6-9]\d{9}/);
  return match ? match[0] : null;
}

/** Shipped via git in public/downloads/ — use CDN path (existsSync fails in Vercel serverless). */
const COMMITTED_DOWNLOADS = new Set(["project-z-setup.exe", "project-z.apk"]);

function publicFileUrl(filename: string, envUrl: string | null): string | null {
  if (envUrl) return envUrl;
  if (COMMITTED_DOWNLOADS.has(filename)) return `/downloads/${filename}`;
  const filePath = path.join(process.cwd(), "public", "downloads", filename);
  if (existsSync(filePath)) return `/downloads/${filename}`;
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
  windowsDownloadUrl: string | null;
};

export function getPublicMarketingConfig(): PublicMarketingConfig {
  const fallback = billingContact();
  const inferredPhone = inferPhoneFromText(fallback);
  const whatsapp = trimOrNull(process.env.NEXT_PUBLIC_WHATSAPP) ?? inferredPhone;
  const phone = trimOrNull(process.env.NEXT_PUBLIC_PHONE) ?? inferredPhone;
  const email = trimOrNull(process.env.NEXT_PUBLIC_BILLING_EMAIL);

  return {
    whatsappDisplay: whatsapp,
    whatsappUrl: toWhatsAppUrl(whatsapp),
    phoneDisplay: phone,
    phoneUrl: toTelUrl(phone),
    email,
    emailUrl: toMailto(email),
    billingFallback: fallback,
    androidApkUrl: publicFileUrl(
      "project-z.apk",
      trimOrNull(process.env.NEXT_PUBLIC_ANDROID_APK_URL)
    ),
    windowsDownloadUrl: publicFileUrl(
      "project-z-setup.exe",
      trimOrNull(process.env.NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL)
    ),
  };
}
