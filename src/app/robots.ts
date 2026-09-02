import type { MetadataRoute } from "next";
import { DEFAULT_PRODUCTION_APP_URL } from "@/lib/brand/constants";

export default function robots(): MetadataRoute.Robots {
  const base = DEFAULT_PRODUCTION_APP_URL;

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/about", "/contact", "/privacy", "/llms.txt"],
      disallow: [
        "/dashboard",
        "/shop",
        "/settings",
        "/ops",
        "/api/",
        "/login",
        "/register",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
