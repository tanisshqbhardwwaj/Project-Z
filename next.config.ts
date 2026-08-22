import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Standalone is for Docker only — Vercel needs default output for serverless NFT tracing.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
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
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
