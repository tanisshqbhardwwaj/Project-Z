"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Barcode, Package, Receipt, ScanLine } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { formatINR } from "@/lib/finance/money";
import {
  parseInventoryCategory,
  parseInventorySubcategory,
} from "@/lib/shop/inventory-categories";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { variantAttributeChips } from "@/lib/shop/variant-display";

type ProductScan = {
  type: "product";
  item: {
    id: string;
    name: string;
    barcode: string | null;
    sku: string | null;
    quantity: number;
    unit: string;
    sellPaise: string | null;
    size: string | null;
    color: string | null;
    variantLabel: string | null;
    /** Resolved by the API — "Premium T-Shirt — Black — Size M". */
    displayName?: string;
    variantSubtitle?: string;
    product?: { id: string; name: string; brand: string | null } | null;
    sectorMeta?: unknown;
    attributes?: unknown;
  };
};

type InvoiceScan = {
  type: "invoice";
  sale: {
    id: string;
    billNumber: string | null;
    customerName: string | null;
    totalPaise: string;
    createdAt: string;
    paymentMethod: string;
  };
};

type ScanResult = ProductScan | InvoiceScan;

export default function ShopScanPage() {
  const router = useRouter();
  const enabledModules = useAuthStore((s) => s.enabledModules);
  const salesEnabled = isModuleEnabled(enabledModules, "shop_sales");
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductScan["item"] | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);
      setProduct(null);

      try {
        const result = await apiFetch<ScanResult>(
          `/api/v1/shop/scan?code=${encodeURIComponent(trimmed)}`
        );

        if (result.type === "invoice") {
          router.push(`/shop/invoices/${result.sale.id}`);
          return;
        }

        setProduct(result.item);
        setCode("");
        inputRef.current?.focus();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Scan failed");
        inputRef.current?.focus();
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  if (!salesEnabled) {
    return (
      <p className="text-muted-foreground">
        Turn on Sales in Manage Organization → Features to use barcode scan.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <ScanLine className="h-7 w-7" />
          Scan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan a product barcode for item details, or a bill barcode to open that
          invoice.
        </p>
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Barcode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleScan(code);
              }
            }}
            placeholder="Scan or type barcode…"
            className="h-12 rounded-xl font-mono text-base"
            disabled={loading}
            autoComplete="off"
          />
          <Button
            className="w-full rounded-xl"
            disabled={loading || !code.trim()}
            onClick={() => void handleScan(code)}
          >
            {loading ? "Looking up…" : "Look up"}
          </Button>
          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {product ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Product
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-lg font-semibold">
              {product.product?.name ?? product.name}
            </p>
            {variantAttributeChips({
              productName: product.product?.name ?? product.name,
              size: product.size,
              color: product.color,
              variantLabel: product.variantLabel,
              brand: product.product?.brand ?? null,
              sku: product.sku,
              attributes: product.attributes,
            }).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {variantAttributeChips({
                  productName: product.product?.name ?? product.name,
                  size: product.size,
                  color: product.color,
                  variantLabel: product.variantLabel,
                  brand: product.product?.brand ?? null,
                  sku: product.sku,
                  attributes: product.attributes,
                }).map((chip) => (
                  <Badge
                    key={`${chip.label}-${chip.value}`}
                    variant="secondary"
                    className="rounded-full text-[11px]"
                  >
                    {chip.label}: {chip.value}
                  </Badge>
                ))}
              </div>
            ) : null}
            {(() => {
              const cat = parseInventoryCategory(product.sectorMeta);
              const sub = parseInventorySubcategory(product.sectorMeta);
              if (!cat && !sub) return null;
              return (
                <p className="text-muted-foreground">
                  {[cat, sub].filter(Boolean).join(" · ")}
                </p>
              );
            })()}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stock</span>
              <span className="font-medium tabular-nums">{product.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sell price</span>
              <span className="font-semibold tabular-nums">
                {product.sellPaise ? formatINR(product.sellPaise) : "—"}
              </span>
            </div>
            {product.barcode ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Barcode className="h-4 w-4 shrink-0" />
                <code className="font-mono text-xs">{product.barcode}</code>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
<<<<<<< HEAD
              <Button
                type="button"
                className="rounded-xl"
                onClick={() => {
                  sessionStorage.setItem(
                    "project-z:scan-add-item",
                    JSON.stringify({
                      name: product.displayName ?? product.name,
                      qty: 1,
                      priceRupees: product.sellPaise
                        ? Number(product.sellPaise) / 100
                        : 0,
                      inventoryItemId: product.id,
                      productId: product.product?.id,
                      barcode: product.barcode ?? undefined,
                      sku: product.sku ?? undefined,
                      size: product.size ?? undefined,
                      color: product.color ?? undefined,
                      variantLabel: product.variantLabel ?? undefined,
                      unit: product.unit,
                    })
                  );
                  router.push("/shop/invoices/new");
                }}
              >
                Add to new bill
              </Button>
=======
>>>>>>> origin/master
              <Link href="/shop/inventory">
                <Button variant="outline" className="rounded-xl">
                  Open inventory
                </Button>
              </Link>
              <Link href="/shop/invoices/new">
                <Button className="rounded-xl">New invoice</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border border-dashed bg-muted/30 shadow-none">
          <CardContent className="flex items-start gap-3 py-6 text-sm text-muted-foreground">
            <Receipt className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Bill barcodes</p>
              <p className="mt-1">
                Scan the barcode at the bottom of a printed invoice to open it
                directly.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
