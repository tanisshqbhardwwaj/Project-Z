/** Company / corporate brand (customer-facing attribution). */
export const COMPANY_NAME = "E-console";

/** Company tagline — ties econsole.in to what the platform does. */
export const COMPANY_TAGLINE = "Powering Digital Possibilities";

/** Full company line for headers and footers. */
export const COMPANY_LINE = `${COMPANY_NAME} — ${COMPANY_TAGLINE}`;

/** Software / product brand (customer-facing product name). */
export const PRODUCT_NAME = "BusinessOS";

/** Primary product tagline. */
export const PRODUCT_TAGLINE = "Manage. Automate. Grow.";

/** Secondary descriptor shown under the product name. */
export const PRODUCT_SUBTITLE = "All-in-one Business Management Platform";

/** Combined product + company line for footers, emails, and metadata. */
export const PRODUCT_BY_COMPANY = `${PRODUCT_NAME} by ${COMPANY_NAME}`;

/** Native app launcher / window title (product + company). */
export const NATIVE_APP_DISPLAY = `${PRODUCT_NAME} · ${COMPANY_NAME}`;

/** Short native launcher name (home screen). */
export const NATIVE_APP_SHORT_NAME = PRODUCT_NAME;

/** Canonical production app URL (www is the Vercel production host). */
export const DEFAULT_PRODUCTION_APP_URL = "https://www.econsole.in";

/** Default verified Resend sender for production (admin.econsole.in subdomain). */
export const DEFAULT_PRODUCTION_EMAIL_FROM = `${COMPANY_NAME} <noreply@admin.econsole.in>`;

/** Resend sandbox sender — local/testing only; delivers to Resend account email. */
export const DEV_EMAIL_FROM = `${PRODUCT_NAME} <onboarding@resend.dev>`;

/** Public asset paths for brand marks and full logo lockups. */
export const ECONSOLE_MARK_PATH = "/brand/econsole-mark.png";
export const ECONSOLE_LOGO_PATH = "/brand/econsole-logo.png";
export const BUSINESSOS_MARK_PATH = "/brand/businessos-mark.png";
export const BUSINESSOS_LOGO_PATH = "/brand/businessos-logo.png";
/** App icon on light backgrounds / light theme home screen. */
export const BUSINESSOS_MARK_LIGHT_PATH = "/brand/businessos-mark-light.png";
/** App icon on dark backgrounds / dark theme home screen. */
export const BUSINESSOS_MARK_DARK_PATH = "/brand/businessos-mark-dark.png";
export const ECONSOLE_MARK_LIGHT_PATH = "/brand/econsole-mark-light.png";
export const ECONSOLE_MARK_DARK_PATH = "/brand/econsole-mark-dark.png";

/** Customer-facing download filenames (saved to user's device). */
export const ANDROID_APK_DOWNLOAD_NAME = "BusinessOS.apk";
export const WINDOWS_SETUP_DOWNLOAD_NAME = "BusinessOS-Setup.exe";

/** Files served from public/downloads/ (lowercase for URLs). */
export const ANDROID_APK_PATH = "businessos.apk";
export const WINDOWS_SETUP_PATH = "businessos-setup.exe";
