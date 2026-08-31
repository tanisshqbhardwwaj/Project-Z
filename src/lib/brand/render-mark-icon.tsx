import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement } from "react";
import {
  BUSINESSOS_MARK_DARK_PATH,
  BUSINESSOS_MARK_LIGHT_PATH,
  BUSINESSOS_MARK_PATH,
} from "@/lib/brand/constants";

const cache = new Map<string, string>();

function getMarkDataUrl(relativePath: string, fallbackPath: string): string {
  const key = `${relativePath}|${fallbackPath}`;
  if (cache.has(key)) return cache.get(key)!;

  const candidates = [relativePath, fallbackPath].map((p) =>
    join(process.cwd(), "public", p.replace(/^\//, ""))
  );

  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      const dataUrl = `data:image/png;base64,${readFileSync(filePath).toString("base64")}`;
      cache.set(key, dataUrl);
      return dataUrl;
    }
  }

  throw new Error(`Missing brand mark: ${relativePath}`);
}

/** Shared BusinessOS mark for Next.js ImageResponse (icon / apple-icon). */
export function renderBrandMarkIcon(size: number, variant: "light" | "dark" = "light"): ReactElement {
  const radius = Math.round(size * 0.22);
  const padding = Math.round(size * 0.08);
  const inner = size - padding * 2;
  const bg = variant === "dark" ? "#0F172A" : "#FFFFFF";
  const markPath = variant === "dark" ? BUSINESSOS_MARK_DARK_PATH : BUSINESSOS_MARK_LIGHT_PATH;

  return (
    <div
      style={{
        width: size,
        height: size,
        background: bg,
        borderRadius: radius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getMarkDataUrl(markPath, BUSINESSOS_MARK_PATH)}
        alt=""
        width={inner}
        height={inner}
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}
