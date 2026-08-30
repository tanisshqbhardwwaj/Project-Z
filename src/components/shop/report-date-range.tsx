"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker, DateRangePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

export type ReportPeriodPreset = "today" | "week" | "month" | "range" | "date";

type ReportDateRangeBarProps = {
  preset: ReportPeriodPreset;
  onPresetChange: (preset: ReportPeriodPreset) => void;
  date?: string;
  onDateChange?: (value: string) => void;
  from?: string;
  to?: string;
  onFromChange?: (value: string) => void;
  onToChange?: (value: string) => void;
  presets?: ReportPeriodPreset[];
  className?: string;
};

const PRESET_LABELS: Record<ReportPeriodPreset, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  date: "Date",
  range: "Custom range",
};

function monthStartIso(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export function ReportDateRangeBar({
  preset,
  onPresetChange,
  date,
  onDateChange,
  from,
  to,
  onFromChange,
  onToChange,
  presets = ["today", "week", "month", "range"],
  className,
}: ReportDateRangeBarProps) {
  const [localFrom, setLocalFrom] = useState(from ?? monthStartIso());
  const [localTo, setLocalTo] = useState(to ?? new Date().toISOString().slice(0, 10));

  const rangeFrom = from ?? localFrom;
  const rangeTo = to ?? localTo;

  const chips = useMemo(
    () => presets.map((p) => ({ key: p, label: PRESET_LABELS[p] })),
    [presets]
  );

  function selectPreset(p: ReportPeriodPreset) {
    onPresetChange(p);
    if (p === "range") {
      onFromChange?.(rangeFrom);
      onToChange?.(rangeTo);
    }
  }

  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>
      <div className="flex flex-wrap gap-1">
        {chips.map(({ key, label }) => (
          <Button
            key={key}
            type="button"
            variant={preset === key ? "default" : "outline"}
            size="sm"
            className="rounded-xl capitalize"
            onClick={() => selectPreset(key)}
          >
            {label}
          </Button>
        ))}
      </div>
      {preset === "date" && onDateChange ? (
        <DatePicker
          value={date}
          onChange={onDateChange}
          className="h-10 w-[200px] rounded-xl"
          placeholder="Pick date"
        />
      ) : null}
      {preset === "range" && onFromChange && onToChange ? (
        <DateRangePicker
          from={rangeFrom}
          to={rangeTo}
          onFromChange={(v) => {
            setLocalFrom(v);
            onFromChange(v);
          }}
          onToChange={(v) => {
            setLocalTo(v);
            onToChange(v);
          }}
          className="h-10 min-w-[240px] rounded-xl"
        />
      ) : null}
    </div>
  );
}
