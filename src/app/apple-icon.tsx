import { ImageResponse } from "next/og";
import { renderBrandMarkIcon } from "@/lib/brand/render-mark-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home screen icon — PNG 180×180 with white background. */
export default function AppleIcon() {
  return new ImageResponse(renderBrandMarkIcon(180), {
    ...size,
  });
}
