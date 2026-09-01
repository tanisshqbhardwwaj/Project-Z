import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import { TOTP, Secret } from "otpauth";

const APP_NAME = "BusinessOS";
const MFA_TOKEN_TTL_MS = 5 * 60 * 1000;
const REGISTRATION_SETUP_TTL_MS = 30 * 60 * 1000;
const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;

function authKey(label: string): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be configured for TOTP");
  }
  return scryptSync(secret, label, 32);
}

export function encryptTotpSecret(plaintext: string): string {
  const key = authKey("totp-enc");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptTotpSecret(payload: string): string {
  const key = authKey("totp-enc");
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8"
  );
}

export function generateTotpSetup(email: string) {
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: APP_NAME,
    label: email,
    algorithm: "SHA1",
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret,
  });

  return {
    secret: secret.base32,
    otpauthUrl: totp.toString(),
  };
}

export function verifyTotpCode(secretBase32: string, code: string): boolean {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;

  const totp = new TOTP({
    secret: Secret.fromBase32(secretBase32),
    algorithm: "SHA1",
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
  });

  const delta = totp.validate({ token: normalized, window: 1 });
  return delta !== null;
}

export function createMfaPendingToken(userId: string): string {
  return signTimedToken(userId, MFA_TOKEN_TTL_MS, "totp-mfa", "login");
}

export function verifyMfaPendingToken(token: string): string {
  return verifyTimedToken(token, "totp-mfa", "login");
}

export function createRegistrationSetupToken(userId: string): string {
  return signTimedToken(userId, REGISTRATION_SETUP_TTL_MS, "totp-reg", "registration");
}

export function verifyRegistrationSetupToken(token: string): string {
  return verifyTimedToken(token, "totp-reg", "registration");
}

function signTimedToken(
  userId: string,
  ttlMs: number,
  keyLabel: string,
  purpose: string
): string {
  const payload = JSON.stringify({
    userId,
    exp: Date.now() + ttlMs,
    purpose,
  });
  const body = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", authKey(keyLabel)).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyTimedToken(token: string, keyLabel: string, purpose: string): string {
  const [body, sig] = token.split(".");
  if (!body || !sig) {
    throw new Error("INVALID_MFA_TOKEN");
  }

  const expected = createHmac("sha256", authKey(keyLabel)).update(body).digest("base64url");

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("INVALID_MFA_TOKEN");
  }

  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    userId?: string;
    exp?: number;
    purpose?: string;
  };

  if (!parsed.userId || typeof parsed.exp !== "number" || parsed.purpose !== purpose) {
    throw new Error("INVALID_MFA_TOKEN");
  }
  if (Date.now() > parsed.exp) {
    throw new Error("MFA_TOKEN_EXPIRED");
  }

  return parsed.userId;
}

export function isTotpEnabled(user: {
  totpEnabledAt: Date | null | undefined;
  totpSecretEnc: string | null | undefined;
}): boolean {
  return Boolean(user.totpEnabledAt && user.totpSecretEnc);
}
