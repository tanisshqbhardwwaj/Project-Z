"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Vendor = { id: string; name: string };

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
      .then(setVendors)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setQuery(vendorName);
  }, [vendorName]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors.slice(0, 8);
    return vendors.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 8);
  }, [vendors, query]);

  const exactMatch = vendors.some(
    (v) => v.name.toLowerCase() === query.trim().toLowerCase()
  );

  async function createVendor(name: string) {
    setCreating(true);
    try {
      const data = await apiFetch<Vendor>("/api/v1/vendors", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      setVendors((prev) => [...prev, data]);
      onChange(data.id, data.name);
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
              onClick={() => createVendor(query)}
            >
              <Plus className="h-4 w-4" />
              Add &quot;{query.trim()}&quot;
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
