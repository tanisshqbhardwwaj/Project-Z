import type { MetadataRoute } from "next";
import {
  BUSINESSOS_MARK_DARK_PATH,
  BUSINESSOS_MARK_LIGHT_PATH,
  NATIVE_APP_DISPLAY,
  NATIVE_APP_SHORT_NAME,
  PRODUCT_BY_COMPANY,
  PRODUCT_TAGLINE,
} from "@/lib/brand/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NATIVE_APP_DISPLAY,
    short_name: NATIVE_APP_SHORT_NAME,
    description: `${PRODUCT_BY_COMPANY}. ${PRODUCT_TAGLINE}`,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#2563EB",
    icons: [
      {
        src: BUSINESSOS_MARK_LIGHT_PATH,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: BUSINESSOS_MARK_DARK_PATH,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
