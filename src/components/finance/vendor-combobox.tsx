"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Vendor = { id: string; name: string };

function normalizeVendorName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function dedupeVendors(vendors: Vendor[]): Vendor[] {
  const byKey = new Map<string, Vendor>();
  for (const vendor of vendors) {
    const key = normalizeVendorName(vendor.name).toLowerCase();
    if (!byKey.has(key)) byKey.set(key, vendor);
  }
  return Array.from(byKey.values());
}

interface VendorComboboxProps {
  value: string;
  vendorName: string;
  onChange: (vendorId: string, vendorName: string) => void;
  className?: string;
}

export function VendorCombobox({
  value,
  vendorName,
  onChange,
  className,
}: VendorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [query, setQuery] = useState(vendorName);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    apiFetch<Vendor[]>("/api/v1/vendors")
      .then((list) => setVendors(dedupeVendors(list)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setQuery(vendorName);
  }, [vendorName]);

  const normalizedQuery = normalizeVendorName(query).toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return vendors.slice(0, 20);
    return vendors
      .filter((v) => normalizeVendorName(v.name).toLowerCase().includes(normalizedQuery))
      .slice(0, 20);
  }, [vendors, normalizedQuery]);

  const exactMatch = vendors.some(
    (v) => normalizeVendorName(v.name).toLowerCase() === normalizedQuery
  );

  async function selectOrCreateVendor(name: string) {
    const trimmed = normalizeVendorName(name);
    if (!trimmed) return;

    const existing = vendors.find(
      (v) => normalizeVendorName(v.name).toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      onChange(existing.id, existing.name);
      setQuery(existing.name);
      setOpen(false);
      return;
    }

    setCreating(true);
    try {
      const data = await apiFetch<Vendor>("/api/v1/vendors", {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
      });
      setVendors((prev) => dedupeVendors([...prev, data]));
      onChange(data.id, data.name);
      setQuery(data.name);
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-12 w-full justify-between rounded-xl px-4 font-normal",
            !vendorName && "text-muted-foreground",
            className
          )}
        >
          {vendorName || "Search or add vendor..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
        <Input
          placeholder="Type vendor name..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) onChange("", "");
          }}
          className="mb-2 h-11 rounded-lg"
        />
        <div className="max-h-48 overflow-y-auto">
          {filtered.map((vendor) => (
            <button
              key={vendor.id}
              type="button"
              className={cn(
                "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm hover:bg-accent",
                value === vendor.id && "bg-accent"
              )}
              onClick={() => {
                onChange(vendor.id, vendor.name);
                setQuery(vendor.name);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  value === vendor.id ? "opacity-100" : "opacity-0"
                )}
              />
              {vendor.name}
            </button>
          ))}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              disabled={creating}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-primary hover:bg-accent"
              onClick={() => selectOrCreateVendor(query)}
            >
              <Plus className="h-4 w-4" />
              Add &quot;{normalizeVendorName(query)}&quot;
            </button>
          )}
          {!query.trim() && filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No vendors yet</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
