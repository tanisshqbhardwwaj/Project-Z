/**
 * Validates environment variables before Vercel/production builds.
 * Fails fast with actionable messages instead of cryptic runtime errors.
 */

const LOCAL_HOST_PATTERNS = ["localhost", "127.0.0.1", "0.0.0.0"];

/** Canonical production host — matches src/lib/brand/constants.ts */
const DEFAULT_PRODUCTION_APP_URL = "https://www.econsole.in";

function isLocalHost(value) {
  return LOCAL_HOST_PATTERNS.some((pattern) => value.includes(pattern));
}

function isPlaceholder(value) {
  if (!value) return true;
  const lower = value.toLowerCase();
  return (
    lower.includes("your_key") ||
    lower.includes("your-key") ||
    lower.includes("changeme") ||
    lower.includes("xxx") ||
    lower === "re_your_key_here"
  );
}

/** @type {Array<{ key: string; label: string; validate: (value: string | undefined, env: NodeJS.ProcessEnv) => string | null }>} */
const CHECKS = [
  {
    key: "TURSO_DATABASE_URL",
    label: "Turso database URL",
    validate(value) {
      if (!value) {
        return "is missing. Create a free database at https://turso.tech → copy the libsql:// URL.";
      }
      if (!value.startsWith("libsql://")) {
        return "must start with libsql:// (from Turso dashboard → Connect).";
      }
      return null;
    },
  },
  {
    key: "TURSO_AUTH_TOKEN",
    label: "Turso auth token",
    validate(value) {
      if (!value) {
        return "is missing. Run: turso db tokens create YOUR-DB-NAME (or copy from Turso dashboard).";
      }
      return null;
    },
  },
  {
    key: "AUTH_SECRET",
    label: "Auth secret",
    validate(value) {
      if (!value) return "is missing. Generate one with: openssl rand -base64 32";
      if (value.length < 16) return "is too short. Use at least 16 characters.";
      return null;
    },
  },
  {
    key: "AUTH_URL",
    label: "Auth URL",
    validate(value) {
      if (!value) return "is missing. Set to your public app URL, e.g. https://www.econsole.in";
      if (isLocalHost(value)) return "must be your public app URL, not localhost.";
      if (!value.startsWith("https://")) return "must use https:// in production.";
      return null;
    },
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    label: "App URL",
    validate(value) {
      if (!value) return "is missing. Set to the same value as AUTH_URL.";
      if (isLocalHost(value)) return "must be your public Vercel URL, not localhost.";
      if (!value.startsWith("https://")) return "must use https:// in production.";
      return null;
    },
  },
  {
    key: "RESEND_API_KEY",
    label: "Resend API key",
    validate(value) {
      if (!value || isPlaceholder(value)) return "is missing. Get one from https://resend.com/api-keys";
      return null;
    },
  },
  {
    key: "EMAIL_FROM",
    label: "Email from address",
    validate(value) {
      if (!value) return "is missing. Example: E-console <noreply@admin.econsole.in>";
      const from = value.trim().replace(/^["']|["']$/g, "");
      const plain = /^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/;
      const named = /^.+ <[^\s<>]+@[^\s<>]+\.[^\s<>]+>$/;
      if (!plain.test(from) && !named.test(from)) {
        return 'has invalid format. Use: noreply@admin.econsole.in or E-console <noreply@admin.econsole.in> (no extra quotes).';
      }
      if (from.toLowerCase().includes("onboarding@resend.dev")) {
        return "must use a verified domain sender in production (e.g. E-console <noreply@admin.econsole.in>), not onboarding@resend.dev.";
      }
      return null;
    },
  },
  {
    key: "S3_ENDPOINT",
    label: "S3 endpoint",
    validate(value) {
      if (!value) return "is missing. For Cloudflare R2: https://<ACCOUNT_ID>.r2.cloudflarestorage.com";
      if (isLocalHost(value)) return "must be your cloud R2/S3 endpoint, not local MinIO.";
      return null;
    },
  },
  {
    key: "S3_ACCESS_KEY_ID",
    label: "S3 access key",
    validate(value) {
      if (!value || value === "minioadmin") return "is missing or still set to local MinIO default.";
      return null;
    },
  },
  {
    key: "S3_SECRET_ACCESS_KEY",
    label: "S3 secret key",
    validate(value) {
      if (!value || value === "minioadmin") return "is missing or still set to local MinIO default.";
      return null;
    },
  },
  {
    key: "S3_BUCKET",
    label: "S3 bucket",
    validate(value) {
      if (!value) return "is missing. Create a bucket in Cloudflare R2.";
      return null;
    },
  },
];

export function applyVercelProductionDefaults(env = process.env) {
  if (!env.VERCEL) return false;
  let applied = false;
  if (!env.AUTH_URL?.trim()) {
    env.AUTH_URL = DEFAULT_PRODUCTION_APP_URL;
    applied = true;
  }
  if (!env.NEXT_PUBLIC_APP_URL?.trim()) {
    env.NEXT_PUBLIC_APP_URL = DEFAULT_PRODUCTION_APP_URL;
    applied = true;
  }
  return applied;
}

export function validateProductionEnv(env = process.env) {
  applyVercelProductionDefaults(env);
  /** @type {string[]} */
  const errors = [];

  // Block accidental paste of local Postgres URL on Vercel (SQLite file URL is OK for Prisma CLI)
  if (
    env.DATABASE_URL &&
    isLocalHost(env.DATABASE_URL) &&
    !env.DATABASE_URL.startsWith("file:")
  ) {
    errors.push(
      "DATABASE_URL points to localhost — remove it from Vercel. This app uses Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN) in production."
    );
  }

  for (const check of CHECKS) {
    const message = check.validate(env[check.key], env);
    if (message) {
      errors.push(`${check.key} (${check.label}): ${message}`);
    }
  }

  if (env.AUTH_URL && env.NEXT_PUBLIC_APP_URL && env.AUTH_URL !== env.NEXT_PUBLIC_APP_URL) {
    errors.push(
      "AUTH_URL and NEXT_PUBLIC_APP_URL must match exactly (same https://www.econsole.in URL)."
    );
  }

  if (env.ALLOW_BETA_EMAIL_BYPASS === "true") {
    errors.push(
      "ALLOW_BETA_EMAIL_BYPASS=true — verification bypass is enabled. Set to false or remove before public launch."
    );
  }

  return errors;
}

export function productionEnvWarnings(env = process.env) {
  /** @type {string[]} */
  const warnings = [];
  const hasUpstash =
    env.UPSTASH_REDIS_REST_URL?.trim() && env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const hasTurso = env.TURSO_DATABASE_URL?.trim() && env.TURSO_AUTH_TOKEN?.trim();
  if (!hasUpstash && !hasTurso) {
    warnings.push(
      "No distributed rate limit backend. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (recommended) or TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (Turso bucket fallback)."
    );
  } else if (!hasUpstash && hasTurso) {
    warnings.push(
      "Using Turso for distributed rate limits. Optional: add Upstash Redis for lower latency at https://upstash.com"
    );
  }
  return warnings;
}

export function printProductionEnvErrors(errors) {
  console.error("\n❌ Production build blocked — fix these Vercel environment variables:\n");
  for (const error of errors) {
    console.error(`  • ${error}`);
  }
  console.error("\nSee TRIAL_DEPLOY.md for a step-by-step Turso + Vercel setup guide.\n");
}

const isDirectRun = process.argv[1]?.endsWith("validate-production-env.mjs");

if (isDirectRun) {
  const errors = validateProductionEnv();
  if (errors.length > 0) {
    printProductionEnvErrors(errors);
    process.exit(1);
  }
  console.log("✓ All production environment variables look valid.");
  for (const warning of productionEnvWarnings()) {
    console.warn(`  ⚠ ${warning}`);
  }
}
