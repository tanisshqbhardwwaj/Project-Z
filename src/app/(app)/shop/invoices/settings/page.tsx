"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import {
  DEFAULT_INVOICE_SETTINGS,
  defaultPrintMarginForPaper,
  parseShopInvoiceSettings,
  resolveShopInvoiceTemplate,
  type InvoicePaperSize,
  type ShopInvoiceSettings,
} from "@/lib/org/shop-settings";
import {
  ShopInvoicePrint,
  type ShopInvoiceData,
} from "@/components/shop/shop-invoice-print";
import { InvoicePreviewRoot } from "@/components/shop/invoice-preview-root";
import { resolvePaperLayout } from "@/lib/shop/print/invoice-print-layout";
import { printShopInvoice } from "@/lib/shop/print/invoice-print-service";
import type { OrgSettingsJson } from "@/lib/org/modules";
import { cn } from "@/lib/utils";
import { fiscalYearLabel } from "@/lib/shop/bill-number";
import { ArrowLeft, Printer, Save } from "lucide-react";

const SAMPLE_INVOICE: ShopInvoiceData = {
  orgName: "Sample Shop",
  billNumber: `INV-4-${fiscalYearLabel()}-00018`,
  customerName: "Rahul Sharma",
  customerPhone: "9876543210",
  customerGstin: "29ABCDE1234F1Z5",
  salesBoyName: "Amit",
  paymentMethod: "UPI",
  notes: "Exchange within 7 days with bill.",
  items: [
    { name: "Premium Cotton Check Shirt — Full Sleeve Blue", qty: 2, priceRupees: 599 },
    { name: "Belt", qty: 1, priceRupees: 350 },
  ],
  totalPaise: "154800",
  gstPaise: "0",
  createdAt: new Date().toISOString(),
  cashierName: "Priya",
};

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function InvoiceSettingsPage() {
  const {
    role,
    activeOrganizationName,
    activeOrgSettings,
    bootstrap,
    setActiveOrg,
  } = useAuthStore();
  const isOwner = hasPermission(role as OrgRole, "org.manage");
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [headerTitle, setHeaderTitle] = useState(DEFAULT_INVOICE_SETTINGS.headerTitle);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [footerText, setFooterText] = useState(DEFAULT_INVOICE_SETTINGS.footerText);
  const [termsText, setTermsText] = useState("");
  const [billPrefix, setBillPrefix] = useState(DEFAULT_INVOICE_SETTINGS.billPrefix);
  const [showLogo, setShowLogo] = useState(DEFAULT_INVOICE_SETTINGS.showLogo);
  const [showBarcode, setShowBarcode] = useState(DEFAULT_INVOICE_SETTINGS.showBarcode);
  const [showCashier, setShowCashier] = useState(DEFAULT_INVOICE_SETTINGS.showCashier);
  const [showSalesStaff, setShowSalesStaff] = useState(DEFAULT_INVOICE_SETTINGS.showSalesStaff);
  const [showCustomerPhone, setShowCustomerPhone] = useState(
    DEFAULT_INVOICE_SETTINGS.showCustomerPhone
  );
  const [showCustomerGstin, setShowCustomerGstin] = useState(
    DEFAULT_INVOICE_SETTINGS.showCustomerGstin
  );
  const [showPaymentMethod, setShowPaymentMethod] = useState(
    DEFAULT_INVOICE_SETTINGS.showPaymentMethod
  );
  const [showSubtotal, setShowSubtotal] = useState(DEFAULT_INVOICE_SETTINGS.showSubtotal);
  const [defaultTaxRatePercent, setDefaultTaxRatePercent] = useState("0");
  const [discountBasis, setDiscountBasis] = useState<"subtotal" | "total">("subtotal");
  const [defaultStaffTarget, setDefaultStaffTarget] = useState("0");
  const [paperSize, setPaperSize] = useState<InvoicePaperSize>(
    DEFAULT_INVOICE_SETTINGS.paperSize
  );
  const [printMarginMm, setPrintMarginMm] = useState(
    String(DEFAULT_INVOICE_SETTINGS.printMarginMm)
  );
  const [defaultCopies, setDefaultCopies] = useState(
    String(DEFAULT_INVOICE_SETTINGS.defaultCopies)
  );
  const [useDecimalPlaces, setUseDecimalPlaces] = useState(
    DEFAULT_INVOICE_SETTINGS.useDecimalPlaces
  );
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const invoice = parseShopInvoiceSettings(activeOrgSettings);
    setDisplayName(invoice.displayName ?? "");
    setHeaderTitle(invoice.headerTitle ?? DEFAULT_INVOICE_SETTINGS.headerTitle);
    setAddress(invoice.address ?? "");
    setPhone(invoice.phone ?? "");
    setEmail(invoice.email ?? "");
    setGstin(invoice.gstin ?? "");
    setFooterText(invoice.footerText ?? DEFAULT_INVOICE_SETTINGS.footerText);
    setTermsText(invoice.termsText ?? "");
    setBillPrefix(invoice.billPrefix ?? DEFAULT_INVOICE_SETTINGS.billPrefix);
    setShowLogo(invoice.showLogo ?? DEFAULT_INVOICE_SETTINGS.showLogo);
    setShowBarcode(invoice.showBarcode ?? DEFAULT_INVOICE_SETTINGS.showBarcode);
    setShowCashier(invoice.showCashier ?? DEFAULT_INVOICE_SETTINGS.showCashier);
    setShowSalesStaff(invoice.showSalesStaff ?? DEFAULT_INVOICE_SETTINGS.showSalesStaff);
    setShowCustomerPhone(
      invoice.showCustomerPhone ?? DEFAULT_INVOICE_SETTINGS.showCustomerPhone
    );
    setShowCustomerGstin(
      invoice.showCustomerGstin ?? DEFAULT_INVOICE_SETTINGS.showCustomerGstin
    );
    setShowPaymentMethod(
      invoice.showPaymentMethod ?? DEFAULT_INVOICE_SETTINGS.showPaymentMethod
    );
    setShowSubtotal(invoice.showSubtotal ?? DEFAULT_INVOICE_SETTINGS.showSubtotal);
    setDefaultTaxRatePercent(String(invoice.defaultTaxRatePercent ?? 0));
    setDiscountBasis(invoice.discountBasis ?? "subtotal");
    setDefaultStaffTarget(String(invoice.defaultStaffMonthlyTargetRupees ?? 0));
    setPaperSize(invoice.paperSize ?? DEFAULT_INVOICE_SETTINGS.paperSize);
    setPrintMarginMm(
      String(
        invoice.printMarginMm ??
          defaultPrintMarginForPaper(
            invoice.paperSize ?? DEFAULT_INVOICE_SETTINGS.paperSize
          )
      )
    );
    setDefaultCopies(String(invoice.defaultCopies ?? DEFAULT_INVOICE_SETTINGS.defaultCopies));
    setUseDecimalPlaces(invoice.useDecimalPlaces ?? DEFAULT_INVOICE_SETTINGS.useDecimalPlaces);
    setLoading(false);
  }, [activeOrgSettings]);

  const draftSettings = useMemo((): ShopInvoiceSettings => {
    return {
      displayName: displayName.trim() || undefined,
      headerTitle: headerTitle.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      gstin: gstin.trim() || undefined,
      footerText: footerText.trim() || undefined,
      termsText: termsText.trim() || undefined,
      billPrefix: billPrefix.trim() || undefined,
      showLogo,
      showBarcode,
      showCashier,
      showSalesStaff,
      showCustomerPhone,
      showCustomerGstin,
      showPaymentMethod,
      showSubtotal,
      defaultTaxRatePercent: Number(defaultTaxRatePercent) || 0,
      discountBasis,
      defaultStaffMonthlyTargetRupees: Number(defaultStaffTarget) || 0,
      paperSize,
      printMarginMm: Number(printMarginMm) || 0,
      defaultCopies: Math.min(5, Math.max(1, Number(defaultCopies) || 1)),
      useDecimalPlaces,
    };
  }, [
    displayName,
    headerTitle,
    address,
    phone,
    email,
    gstin,
    footerText,
    termsText,
    billPrefix,
    showLogo,
    showBarcode,
    showCashier,
    showSalesStaff,
    showCustomerPhone,
    showCustomerGstin,
    showPaymentMethod,
    showSubtotal,
    defaultTaxRatePercent,
    discountBasis,
    defaultStaffTarget,
    paperSize,
    printMarginMm,
    defaultCopies,
    useDecimalPlaces,
  ]);

  const previewTemplate = useMemo(() => {
    const merged: OrgSettingsJson = {
      ...(activeOrgSettings ?? {}),
      shop: {
        ...(activeOrgSettings?.shop ?? {}),
        invoice: draftSettings,
      },
    };
    return resolveShopInvoiceTemplate(activeOrganizationName ?? "Shop", merged);
  }, [activeOrgSettings, activeOrganizationName, draftSettings]);

  async function handlePrintSample() {
    setPrinting(true);
    try {
      await printShopInvoice(
        {
          paperSize: previewTemplate.paperSize,
          printMarginMm: previewTemplate.printMarginMm,
          template: previewTemplate,
        },
        { onComplete: () => setPrinting(false) }
      );
    } catch {
      setPrinting(false);
    }
  }

  async function save() {
    if (!isOwner) return;
    clear();
    setSavedMessage("");
    if (!billPrefix.trim()) {
      showWarning("Bill prefix is required");
      return;
    }
    setSaving(true);
    try {
      const updated = await apiFetch<{
        id: string;
        name: string;
        businessType: string;
        shopSector?: string | null;
        settings?: OrgSettingsJson;
        timezone?: string;
      }>("/api/v1/organizations", {
        method: "PATCH",
        body: JSON.stringify({
          settings: {
            shop: {
              invoice: draftSettings,
            },
          },
        }),
      });
      setActiveOrg(
        updated.id,
        updated.name,
        role ?? "OWNER",
        updated.businessType as never,
        updated.shopSector as never,
        Boolean(updated.settings?.modules?.staff),
        updated.settings?.modules ?? {},
        updated.timezone ?? "Asia/Kolkata",
        null,
        null,
        updated.settings ?? null
      );
      await bootstrap();
      setSavedMessage("Invoice settings saved");
    } catch (err) {
      applyError(err, "Failed to save invoice settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader label="Loading invoice settings..." />;

  return (
    <div className="space-y-6">
      {printing ? (
        <div className="print-hidden fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm">
          <p className="rounded-xl border bg-card px-8 py-6 text-sm font-medium shadow-xl">
            Printing sample…
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/shop/invoices"
            className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to invoices
          </Link>
          <h1 className="text-2xl font-bold sm:text-3xl">Invoice settings</h1>
          <p className="text-sm text-muted-foreground">
            Customize your invoice template — header, shop details, and what to show
          </p>
        </div>
        {isOwner ? (
          <Button
            size="lg"
            className="rounded-xl"
            onClick={() => void save()}
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save settings"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only the owner can change invoice settings.
          </p>
        )}
      </div>

      <FormFeedback warning={warning} error={error} />
      {savedMessage ? (
        <p className="text-sm font-medium text-emerald-600">{savedMessage}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Shop details on invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Display name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder={activeOrganizationName ?? "Shop name"}
                  disabled={!isOwner}
                />
                <p className="text-xs text-muted-foreground">
                  Shown at the top. Leave blank to use brand name or organization name.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Header title</Label>
                <Input
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  className="h-11 rounded-xl"
                  disabled={!isOwner}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="min-h-[80px] w-full rounded-xl border bg-background px-3 py-2 text-sm"
                  placeholder="Shop no, street, city, PIN"
                  disabled={!isOwner}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 rounded-xl"
                    disabled={!isOwner}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl"
                    disabled={!isOwner}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Your GSTIN</Label>
                <Input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="h-11 rounded-xl font-mono uppercase"
                  disabled={!isOwner}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Logo is shared with label printing. Upload it in{" "}
                <Link href="/settings/organization" className="underline">
                  Organization settings
                </Link>
                .
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Bill & footer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Bill number prefix</Label>
                <Input
                  value={billPrefix}
                  onChange={(e) => setBillPrefix(e.target.value.toUpperCase())}
                  className="h-11 max-w-[120px] rounded-xl font-mono uppercase"
                  maxLength={10}
                  disabled={!isOwner}
                />
                <p className="text-xs text-muted-foreground">
                  New bills: {billPrefix || "INV"}-4-{fiscalYearLabel()}-00018
                </p>
              </div>
              <div className="space-y-2">
                <Label>Default GST / tax rate %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={defaultTaxRatePercent}
                  onChange={(e) => setDefaultTaxRatePercent(e.target.value)}
                  className="h-11 max-w-[120px] rounded-xl"
                  disabled={!isOwner}
                />
                <p className="text-xs text-muted-foreground">
                  Pre-filled on new invoices (e.g. 18 for 18% GST).
                </p>
              </div>
              <div className="space-y-2">
                <Label>Discount applied on</Label>
                <div className="flex rounded-xl border p-1">
                  {(
                    [
                      ["subtotal", "Subtotal (before tax)"],
                      ["total", "Total (incl. tax)"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={!isOwner}
                      onClick={() => setDiscountBasis(value)}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
                        discountBasis === value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Controls whether % or ₹ discount is calculated on item subtotal or
                  grand total including tax.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Default monthly sales target per staff (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={defaultStaffTarget}
                  onChange={(e) => setDefaultStaffTarget(e.target.value)}
                  className="h-11 max-w-[160px] rounded-xl"
                  disabled={!isOwner}
                />
                <p className="text-xs text-muted-foreground">
                  Used on dashboard &quot;This month&quot; view for progress bars.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Invoice note (optional)</Label>
                <textarea
                  value={termsText}
                  onChange={(e) => setTermsText(e.target.value)}
                  className="min-h-[72px] w-full rounded-xl border bg-background px-3 py-2 text-sm"
                  placeholder="Return policy, warranty, delivery note…"
                  disabled={!isOwner}
                />
                <p className="text-xs text-muted-foreground">
                  Printed on every invoice — not entered per sale.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Footer message</Label>
                <Input
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="h-11 rounded-xl"
                  disabled={!isOwner}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Print settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Saved for every invoice — preview and print use the same layout
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Paper size</Label>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["58mm", "58mm thermal"],
                      ["80mm", "80mm thermal"],
                      ["A4", "A4"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={!isOwner}
                      onClick={() => {
                        setPaperSize(value);
                        setPrintMarginMm(String(defaultPrintMarginForPaper(value)));
                      }}
                      className={cn(
                        "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                        paperSize === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:border-foreground/30"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Print margin (mm)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={printMarginMm}
                    onChange={(e) => setPrintMarginMm(e.target.value)}
                    className="h-11 rounded-xl"
                    disabled={!isOwner}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use 0 for thermal rolls. A4 usually needs 10mm.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Default copies</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={defaultCopies}
                    onChange={(e) => setDefaultCopies(e.target.value)}
                    className="h-11 rounded-xl"
                    disabled={!isOwner}
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown as a hint when printing. Browser dialog may still ask.
                  </p>
                </div>
              </div>
              <ToggleRow
                label="Show paise (₹.00)"
                description="When off, invoices use whole rupees with no round-off line."
                checked={useDecimalPlaces}
                disabled={!isOwner}
                onCheckedChange={setUseDecimalPlaces}
              />
              <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                Select your thermal printer once in the browser print dialog. Chrome
                usually remembers it for this site. Silent/direct printing can be added
                later via a desktop print service.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Show on invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ToggleRow
                label="Shop logo"
                description="Uses logo from organization settings"
                checked={showLogo}
                disabled={!isOwner}
                onCheckedChange={setShowLogo}
              />
              <ToggleRow
                label="Bill barcode"
                checked={showBarcode}
                disabled={!isOwner}
                onCheckedChange={setShowBarcode}
              />
              <ToggleRow
                label="Subtotal line"
                checked={showSubtotal}
                disabled={!isOwner}
                onCheckedChange={setShowSubtotal}
              />
              <ToggleRow
                label="Payment method"
                checked={showPaymentMethod}
                disabled={!isOwner}
                onCheckedChange={setShowPaymentMethod}
              />
              <ToggleRow
                label="Cashier name"
                checked={showCashier}
                disabled={!isOwner}
                onCheckedChange={setShowCashier}
              />
              <ToggleRow
                label="Sales staff"
                checked={showSalesStaff}
                disabled={!isOwner}
                onCheckedChange={setShowSalesStaff}
              />
              <ToggleRow
                label="Customer phone"
                checked={showCustomerPhone}
                disabled={!isOwner}
                onCheckedChange={setShowCustomerPhone}
              />
              <ToggleRow
                label="Customer GSTIN"
                checked={showCustomerGstin}
                disabled={!isOwner}
                onCheckedChange={setShowCustomerGstin}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-0 shadow-md xl:sticky xl:top-4 xl:self-start">
          <CardHeader>
            <CardTitle className="text-lg">Template preview</CardTitle>
            <p className="text-sm text-muted-foreground">
              Same layout used for billing and printing ({paperSize})
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-fit rounded-xl"
              onClick={() => void handlePrintSample()}
            >
              <Printer className="mr-2 h-4 w-4" />
              PRINT INVOICE
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center overflow-hidden rounded-xl border bg-neutral-50/80 py-3">
              <InvoicePreviewRoot
                paperSize={previewTemplate.paperSize}
                printMarginMm={previewTemplate.printMarginMm}
              >
                <ShopInvoicePrint
                  invoice={{
                    ...SAMPLE_INVOICE,
                    orgName: previewTemplate.displayName,
                  }}
                  template={previewTemplate}
                  compact={resolvePaperLayout(previewTemplate.paperSize).compact}
                  barcodeHeight={
                    resolvePaperLayout(previewTemplate.paperSize).barcodeHeight
                  }
                />
              </InvoicePreviewRoot>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
