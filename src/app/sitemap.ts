import type { MetadataRoute } from "next";
import { DEFAULT_PRODUCTION_APP_URL } from "@/lib/brand/constants";

const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/pricing/compare",
  "/about",
  "/contact",
  "/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = DEFAULT_PRODUCTION_APP_URL;

  return PUBLIC_PATHS.map((path) => ({
    url: path === "/" ? base : `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/pricing" ? 0.9 : 0.7,
  }));
}
