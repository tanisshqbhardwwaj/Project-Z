import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { APP_CONTENT_SECURITY_POLICY } from "./src/lib/security/csp";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: APP_CONTENT_SECURITY_POLICY,
  },
];

const nextConfig: NextConfig = {
  // Tauri desktop loads http://127.0.0.1:3000 (not localhost).
  allowedDevOrigins: ["127.0.0.1"],
  // Standalone is for Docker only — Vercel needs default output for serverless NFT tracing.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
<<<<<<< HEAD
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "tesseract.js", "inngest", "heic-convert", "sql.js"],
  turbopack: {
    resolveAlias: {
      "sql.js": "./src/lib/local-db/sqljs-browser-stub.ts",
    },
=======
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "tesseract.js", "inngest", "heic-convert"],
  async redirects() {
    return [
      {
        source: "/shop/sales",
        destination: "/shop/invoices",
        permanent: false,
      },
      {
        source: "/shop/sales/invoice/:id",
        destination: "/shop/invoices/:id",
        permanent: false,
      },
    ];
>>>>>>> origin/master
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/sql-wasm.wasm",
        headers: [{ key: "Content-Type", value: "application/wasm" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
