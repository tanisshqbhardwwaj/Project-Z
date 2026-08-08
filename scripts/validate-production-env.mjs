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

/** @type {Array<{ key: string; label: string; validate: (value: string | undefined) => string | null }>} */
const CHECKS = [
  {
    key: "DATABASE_URL",
    label: "Database",
    validate(value) {
      if (!value) return "is missing. Add your Neon Postgres connection string in Vercel → Settings → Environment Variables.";
      if (isLocalHost(value)) {
        return "points to localhost. Vercel cannot reach your local Docker Postgres. Paste your Neon URL from https://neon.tech instead.";
      }
      if (!value.startsWith("postgresql://") && !value.startsWith("postgres://")) {
        return "must start with postgresql:// (Neon connection string).";
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

  for (const check of CHECKS) {
    const message = check.validate(env[check.key]);
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
  console.error("\nSee TRIAL_DEPLOY.md for a step-by-step setup guide.\n");
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
