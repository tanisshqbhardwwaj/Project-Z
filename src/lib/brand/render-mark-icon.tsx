import type { ReactElement } from "react";

/** Shared Project Z mark for Next.js ImageResponse (icon / apple-icon). */
export function renderBrandMarkIcon(size: number): ReactElement {
  const radius = Math.round(size * 0.25);
  const border = Math.max(1, Math.round(size * 0.02));
  const inner = Math.round(size * 0.72);

  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#FFFFFF",
        borderRadius: radius,
        border: `${border}px solid #E2E8F0`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="pz-icon-gradient" x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22D3EE" />
            <stop offset="0.35" stopColor="#FACC15" />
            <stop offset="0.65" stopColor="#FB923C" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <path
          d="M10 10H34M34 10L10 38M10 38H34"
          stroke="url(#pz-icon-gradient)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="10" r="3.5" fill="url(#pz-icon-gradient)" />
        <circle cx="34" cy="10" r="3.5" fill="url(#pz-icon-gradient)" />
        <circle cx="10" cy="38" r="3.5" fill="url(#pz-icon-gradient)" />
        <circle cx="34" cy="38" r="3.5" fill="url(#pz-icon-gradient)" />
        <circle cx="22" cy="24" r="3" fill="url(#pz-icon-gradient)" />
      </svg>
    </div>
  );
}
