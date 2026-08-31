import { Resend } from "resend";
import { enforceResendEmailRateLimitByIp } from "@/lib/rate-limit";
import {
  DEV_EMAIL_FROM,
  PRODUCT_BY_COMPANY,
  PRODUCT_NAME,
} from "@/lib/brand/constants";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/** Resend test sender — works without domain verification (deliver to your Resend account email). */
export const DEFAULT_EMAIL_FROM = DEV_EMAIL_FROM;

const PLAIN_EMAIL_FROM = /^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/;
const NAMED_EMAIL_FROM = /^.+ <[^\s<>]+@[^\s<>]+\.[^\s<>]+>$/;

/** Strip quotes often pasted from .env files into Vercel. */
export function normalizeEmailFrom(raw: string | undefined): string {
  let from = raw?.trim() ?? "";
  while (
    from.length >= 2 &&
    ((from.startsWith('"') && from.endsWith('"')) ||
      (from.startsWith("'") && from.endsWith("'")))
  ) {
    from = from.slice(1, -1).trim();
  }
  return from;
}

export function isValidResendFrom(from: string): boolean {
  return PLAIN_EMAIL_FROM.test(from) || NAMED_EMAIL_FROM.test(from);
}

export function isResendTestSender(from: string): boolean {
  const normalized = normalizeEmailFrom(from).toLowerCase();
  return normalized.includes("onboarding@resend.dev");
}

export function getEmailFrom(): string {
  const normalized = normalizeEmailFrom(process.env.EMAIL_FROM);
  if (!normalized) return DEFAULT_EMAIL_FROM;
  if (!isValidResendFrom(normalized)) {
    console.warn(
      `[EMAIL] Invalid EMAIL_FROM "${normalized}" — falling back to ${DEFAULT_EMAIL_FROM}`
    );
    return DEFAULT_EMAIL_FROM;
  }
  return normalized;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  /** Logged in dev when Resend is off or as backup after send */
  devLink?: string;
  /** When set, counts toward the daily Resend send cap for this IP (5 / 24h). */
  clientIp?: string;
}) {
  if (options.clientIp) {
    await enforceResendEmailRateLimitByIp(options.clientIp);
  }

  const resend = getResendClient();
  const from = getEmailFrom();

  if (!resend) {
    console.log("[DEV EMAIL]", options.to, options.subject);
    if (options.devLink) console.log("[DEV EMAIL LINK]", options.devLink);
    return { id: "dev", error: null };
  }

  const { data, error } = await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (error) {
    console.error("[EMAIL ERROR]", error.message);
    if (process.env.NODE_ENV === "development" && options.devLink) {
      console.log("[DEV EMAIL FALLBACK — use this link]", options.devLink);
    }
    throw new Error(error.message);
  }

  if (process.env.NODE_ENV === "development" && options.devLink) {
    console.log("[EMAIL SENT]", options.to, "— backup link:", options.devLink);
  }

  return { id: data?.id ?? "sent", error: null };
}

export function verificationEmailHtml(name: string, url: string) {
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2>Verify your email</h2>
      <p>Hello ${name},</p>
      <p>Please verify your email address for <strong>${PRODUCT_NAME}</strong>:</p>
      <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#1e3a5f;color:#fff;text-decoration:none;border-radius:8px;">Verify Email</a></p>
      <p style="color:#64748b;font-size:14px;">Or copy this link:<br/><a href="${url}">${url}</a></p>
      <p style="color:#64748b;font-size:14px;">This link expires in 24 hours.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">${PRODUCT_BY_COMPANY}</p>
    </div>
  `;
}

export function passwordResetEmailHtml(name: string, url: string) {
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2>Reset your password</h2>
      <p>Hello ${name},</p>
      <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#1e3a5f;color:#fff;text-decoration:none;border-radius:8px;">Reset Password</a></p>
      <p style="color:#64748b;font-size:14px;">This link expires in 1 hour.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">${PRODUCT_BY_COMPANY}</p>
    </div>
  `;
}

export function inviteEmailHtml(orgName: string, url: string) {
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2>Organization team invite</h2>
      <p>You have been invited to join organization <strong>${orgName}</strong> on ${PRODUCT_NAME}.</p>
      <p style="color:#64748b;font-size:14px;">This is an org-level team invite, not a specific work order.</p>
      <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#1e3a5f;color:#fff;text-decoration:none;border-radius:8px;">Accept Invitation</a></p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">${PRODUCT_BY_COMPANY}</p>
    </div>
  `;
}

export function projectPartnerInviteEmailHtml(
  projectName: string,
  workOrderNumber: string | null,
  url: string
) {
  const woLine = workOrderNumber ? `<p>Work Order: <strong>#${workOrderNumber}</strong></p>` : "";
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2>Work partner invitation</h2>
      <p>You have been invited as a <strong>partner on this work order</strong> (not the whole organization).</p>
      <p>Project: <strong>${projectName}</strong></p>
      ${woLine}
      <p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">Join This Work Order</a></p>
      <p style="color:#64748b;font-size:14px;">Or copy: <a href="${url}">${url}</a></p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">${PRODUCT_BY_COMPANY}</p>
    </div>
  `;
}
