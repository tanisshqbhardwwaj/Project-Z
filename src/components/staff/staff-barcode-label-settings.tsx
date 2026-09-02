"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { settingsCardClass } from "@/components/settings/settings-page-shell";
import type { StaffBarcodeLabelFields } from "@/lib/staff/barcode-label-settings";
import { cn } from "@/lib/utils";

const FIELD_OPTIONS = [
  ["showName", "Staff name"],
  ["showRole", "Role / job title"],
  ["showPhone", "Phone number"],
  ["showEmail", "Email address"],
  ["showOrgName", "Organization name"],
] as const satisfies ReadonlyArray<
  [keyof StaffBarcodeLabelFields, string]
>;

export function StaffBarcodeLabelSettingsCard({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: StaffBarcodeLabelFields;
  onChange: (next: StaffBarcodeLabelFields) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn(settingsCardClass, className)}>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider leading-none text-muted-foreground">
          Staff attendance barcodes
        </CardTitle>
        <p className="text-sm normal-case leading-snug text-muted-foreground">
          Choose what appears on printed barcode labels for your team.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELD_OPTIONS.map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm"
            >
              <input
                type="checkbox"
                checked={value[key]}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    ...value,
                    [key]: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Generate and print barcodes from{" "}
          <span className="font-medium text-foreground">Staff → People</span>.
        </p>
      </CardContent>
    </Card>
  );
}
