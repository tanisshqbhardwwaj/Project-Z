"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import type { DateRange, Matcher } from "react-day-picker";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  fromDate?: Date;
  toDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  fromDate,
  toDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const date = value ? parseISO(value) : undefined;
  const selected = date && isValid(date) ? date : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-12 w-full justify-start rounded-xl border-input bg-background px-4 text-left font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {selected ? format(selected, "dd MMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          disabled={
            fromDate || toDate
              ? ({
                  ...(fromDate ? { before: fromDate } : {}),
                  ...(toDate ? { after: toDate } : {}),
                } as Matcher)
              : undefined
          }
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

interface ReadOnlyDatePickerProps {
  value?: string;
  label?: string;
  className?: string;
}

export function ReadOnlyDatePicker({ value, label, className }: ReadOnlyDatePickerProps) {
  const date = value ? parseISO(value) : undefined;
  const display = date && isValid(date) ? format(date, "dd MMM yyyy") : "—";

  return (
    <div
      className={cn(
        "flex h-12 w-full items-center rounded-xl border border-input bg-muted/40 px-4 text-sm",
        className
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        {label && <p className="text-xs text-muted-foreground">{label}</p>}
        <p className="font-medium">{display}</p>
      </div>
    </div>
  );
}

interface DateRangePickerProps {
  from?: string;
  to?: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  placeholder = "Pick a date range",
  disabled,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const fromDate = from ? parseISO(from) : undefined;
  const toDate = to ? parseISO(to) : undefined;
  const selected: DateRange | undefined =
    fromDate && isValid(fromDate)
      ? {
          from: fromDate,
          to: toDate && isValid(toDate) ? toDate : undefined,
        }
      : undefined;

  const label =
    selected?.from && selected?.to
      ? `${format(selected.from, "dd MMM yyyy")} – ${format(selected.to, "dd MMM yyyy")}`
      : selected?.from
        ? `${format(selected.from, "dd MMM yyyy")} – …`
        : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-start rounded-xl border-input bg-background px-4 text-left font-normal",
            !selected?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={selected}
          onSelect={(range) => {
            if (range?.from) onFromChange(format(range.from, "yyyy-MM-dd"));
            if (range?.to) {
              onToChange(format(range.to, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
