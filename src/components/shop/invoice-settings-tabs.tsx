"use client";

import { cn } from "@/lib/utils";

export const INVOICE_SETTINGS_TABS = [
  { id: "shop", label: "Shop details", shortLabel: "Shop" },
  { id: "bill", label: "Bill & footer", shortLabel: "Bill" },
  { id: "print", label: "Print settings", shortLabel: "Print" },
  { id: "terminal", label: "Card machine", shortLabel: "Card" },
  { id: "display", label: "Show on invoice", shortLabel: "Display" },
] as const;

export type InvoiceSettingsTab = (typeof INVOICE_SETTINGS_TABS)[number]["id"];

type InvoiceSettingsTabsProps = {
  activeTab: InvoiceSettingsTab;
  onChange: (tab: InvoiceSettingsTab) => void;
};

export function InvoiceSettingsTabs({ activeTab, onChange }: InvoiceSettingsTabsProps) {
  return (
    <nav aria-label="Invoice settings sections">
      <div className="rounded-xl border border-border bg-muted/50 p-1">
        <div className="flex w-full gap-1 overflow-x-auto">
          {INVOICE_SETTINGS_TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={selected ? "page" : undefined}
                onClick={() => onChange(tab.id)}
                className={cn(
                  "h-10 min-w-[4.75rem] flex-1 rounded-lg px-2 text-sm font-medium transition-colors sm:h-11 sm:min-w-0 sm:px-3",
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/90 hover:text-foreground"
                )}
              >
                <span className="whitespace-nowrap sm:hidden">{tab.shortLabel}</span>
                <span className="hidden whitespace-nowrap sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
