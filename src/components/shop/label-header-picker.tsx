"use client";

import type { FullLabelHeaderMode } from "@/lib/org/shop-settings";
import { cn } from "@/lib/utils";

const OPTIONS: { id: FullLabelHeaderMode; label: string }[] = [
  { id: "both", label: "Logo + name" },
  { id: "logo", label: "Logo only" },
  { id: "name", label: "Name only" },
];

type LabelHeaderPickerProps = {
  value: FullLabelHeaderMode;
  onChange: (mode: FullLabelHeaderMode) => void;
  hasLogo: boolean;
};

export function LabelHeaderPicker({ value, onChange, hasLogo }: LabelHeaderPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Full tag header</p>
      <div className="grid grid-cols-3 gap-1">
        {OPTIONS.map((opt) => {
          const disabled = opt.id !== "name" && !hasLogo;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={cn(
                "rounded-xl border px-2 py-2 text-[11px] font-medium leading-tight",
                value === opt.id ? "border-primary bg-primary/5" : "border-border",
                disabled && "cursor-not-allowed opacity-40"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {!hasLogo ? (
        <p className="text-[11px] text-muted-foreground">
          Upload a logo in Manage Organization to use logo-only tags.
        </p>
      ) : null}
    </div>
  );
}
