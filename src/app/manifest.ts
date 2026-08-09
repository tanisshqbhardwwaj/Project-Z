import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Project Z",
    short_name: "Project Z",
    description: "Manage work orders, projects, expenses, and partner settlements",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    icons: [
      {
        src: "/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
