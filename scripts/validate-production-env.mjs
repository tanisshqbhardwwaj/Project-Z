/**
 * Validates environment variables before Vercel/production builds.
 * Fails fast with actionable messages instead of cryptic runtime errors.
 */

const LOCAL_HOST_PATTERNS = ["localhost", "127.0.0.1", "0.0.0.0"];

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
      if (!value) return "is missing. Set to your Vercel URL, e.g. https://your-app.vercel.app";
      if (isLocalHost(value)) return "must be your public Vercel URL, not localhost.";
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
      if (!value) return "is missing. Example: Project Z <onboarding@resend.dev>";
      const from = value.trim().replace(/^["']|["']$/g, "");
      const plain = /^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/;
      const named = /^.+ <[^\s<>]+@[^\s<>]+\.[^\s<>]+>$/;
      if (!plain.test(from) && !named.test(from)) {
        return 'has invalid format. Use: onboarding@resend.dev or Project Z <onboarding@resend.dev> (no extra quotes).';
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

export function validateProductionEnv(env = process.env) {
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
      "AUTH_URL and NEXT_PUBLIC_APP_URL must match exactly (same https://your-app.vercel.app URL)."
    );
  }

  return errors;
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
}
