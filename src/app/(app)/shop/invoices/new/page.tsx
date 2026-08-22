"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { InvoiceEntryForm } from "@/components/shop/invoice-entry-form";
import { InvoiceLivePreview, buildDraftInvoice } from "@/components/shop/invoice-live-preview";
import type { ShopInvoiceData } from "@/components/shop/shop-invoice-print";
import { computeInvoicePricing } from "@/lib/shop/invoice-pricing";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import {
  useShopInvoicePrint,
  type CashTender,
} from "@/hooks/use-shop-invoice-print";

export default function NewInvoicePage() {
  const { activeBusinessType, activeOrganizationName, enabledModules, user } =
    useAuthStore();
  const salesEnabled = isModuleEnabled(enabledModules, "shop_sales");
  const title = moduleLabel("shop_sales", activeBusinessType ?? "SHOPKEEPER");

  const [draft, setDraft] = useState<ShopInvoiceData>(() =>
    buildDraftInvoice({
      orgName: activeOrganizationName ?? "Shop",
      cashierName: user?.name,
      customerName: "",
      customerPhone: "",
      customerGstin: "",
      salesBoyName: "",
      paymentMethod: "CASH",
      cart: [],
      pricing: computeInvoicePricing({ items: [] }),
    })
  );
  const [resetKey, setResetKey] = useState(0);
  const [printCashTender, setPrintCashTender] = useState<CashTender | null>(null);

  const { printInvoice, PrintLayer } = useShopInvoicePrint({
    onComplete: () => {
      setPrintCashTender(null);
      setResetKey((k) => k + 1);
    },
  });

  const onDraftChange = useCallback((next: ShopInvoiceData) => {
    setDraft(next);
  }, []);

  function handleSaved(
    _sale: unknown,
    invoice: ShopInvoiceData,
    cashTender?: CashTender | null
  ) {
    setDraft(invoice);
    setPrintCashTender(cashTender ?? null);
    window.setTimeout(() => {
      void printInvoice();
    }, 80);
  }

  if (!salesEnabled) {
    return (
      <p className="text-muted-foreground">
        Turn on {title} in Manage Organization → Features.
      </p>
    );
  }

  return (
    <>
      <PrintLayer />
      <div className="min-w-0 space-y-4">
        <div className="print-hidden flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">New invoice</h1>
            <p className="text-sm text-muted-foreground">
              Live preview updates as you add items
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/shop/invoices/settings">
              <Button variant="outline" className="rounded-xl">
                <Settings className="mr-2 h-4 w-4" />
                Invoice settings
              </Button>
            </Link>
            <Link href="/shop/invoices">
              <Button variant="outline" className="rounded-xl">
                Recent invoices
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[2fr_3fr]">
          <div className="order-1 min-w-0 xl:sticky xl:top-4 xl:self-start">
            <InvoiceLivePreview invoice={draft} cashTender={printCashTender} />
          </div>
          <div className="order-2 min-w-0">
            <InvoiceEntryForm
              resetKey={resetKey}
              onDraftChange={onDraftChange}
              onSaved={handleSaved}
            />
          </div>
        </div>
      </div>
    </>
  );
}
