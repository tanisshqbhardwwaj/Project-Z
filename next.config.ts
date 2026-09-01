import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { APP_CONTENT_SECURITY_POLICY } from "./src/lib/security/csp";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "Content-Security-Policy", value: APP_CONTENT_SECURITY_POLICY },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const isNativeStatic = process.env.NATIVE_STATIC === "1";

const nextConfig: NextConfig = {
  ...(isNativeStatic
    ? {
        output: "export" as const,
        distDir: "native-out",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : process.env.VERCEL
      ? {}
      : { output: "standalone" as const }),
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "tesseract.js", "inngest", "heic-convert", "sql.js"],
  turbopack: {
    resolveAlias: {
      "sql.js": "./src/lib/local-db/sqljs-browser-stub.ts",
    },
  },
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
