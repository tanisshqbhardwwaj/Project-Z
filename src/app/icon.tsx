import { ImageResponse } from "next/og";
import { renderBrandMarkIcon } from "@/lib/brand/render-mark-icon";

export const contentType = "image/png";

export function generateImageMetadata() {
  return [
    { contentType: "image/png", size: { width: 32, height: 32 }, id: "32" },
    { contentType: "image/png", size: { width: 192, height: 192 }, id: "192" },
    { contentType: "image/png", size: { width: 512, height: 512 }, id: "512" },
  ];
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const iconId = await id;
  const size = Number(iconId) || 32;

  return new ImageResponse(renderBrandMarkIcon(size), {
    width: size,
    height: size,
  });
}
