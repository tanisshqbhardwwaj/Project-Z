import { cn } from "@/lib/utils";

export function ProjectZMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pz-mark-gradient" x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" />
          <stop offset="0.35" stopColor="#FACC15" />
          <stop offset="0.65" stopColor="#FB923C" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <path
        d="M10 10H34M34 10L10 38M10 38H34"
        stroke="url(#pz-mark-gradient)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="3.5" fill="url(#pz-mark-gradient)" />
      <circle cx="34" cy="10" r="3.5" fill="url(#pz-mark-gradient)" />
      <circle cx="10" cy="38" r="3.5" fill="url(#pz-mark-gradient)" />
      <circle cx="34" cy="38" r="3.5" fill="url(#pz-mark-gradient)" />
      <circle cx="22" cy="24" r="3" fill="url(#pz-mark-gradient)" />
    </svg>
  );
}
