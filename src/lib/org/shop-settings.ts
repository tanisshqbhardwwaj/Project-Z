import {
  mergePaymentTerminalConfig,
  parsePaymentTerminalConfig,
  sanitizePaymentTerminalConfig,
  type PaymentTerminalConfig,
  type PaymentTerminalConfigPublic,
} from "@/lib/shop/payment-terminal";

export type DiscountBasis = "subtotal" | "total";

export type InvoicePaperSize = "58mm" | "80mm" | "A4";

export type ShopInvoiceSettings = {
  headerTitle?: string;
  displayName?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  footerText?: string;
  termsText?: string;
  showLogo?: boolean;
  showBarcode?: boolean;
  showCashier?: boolean;
  showSalesStaff?: boolean;
  showCustomerPhone?: boolean;
  showCustomerGstin?: boolean;
  showPaymentMethod?: boolean;
  showSubtotal?: boolean;
  /** Short code used as the first bill-number segment, e.g. "BF" → BF/26-27/R2/0042. */
  storeCode?: string;
  billPrefix?: string;
  defaultTaxRatePercent?: number;
  /** Whether % / fixed discount applies to line subtotal or grand total (incl. tax) */
  discountBasis?: DiscountBasis;
  defaultStaffMonthlyTargetRupees?: number;
  staffMonthlyTargets?: Record<string, number>;
  /** Receipt paper width for preview and print. Default 80mm. */
  paperSize?: InvoicePaperSize;
  /** Page margin in mm. Default 0 for thermal, 10 for A4. */
  printMarginMm?: number;
  /** Suggested copy count (browser dialog may still ask). Default 1. */
  defaultCopies?: number;
  /** When false, show whole rupees only and skip bill round-off. Default true. */
  useDecimalPlaces?: boolean;
  /** Card/UPI machine integration (Paytm, Pine Labs, bridge, etc.). */
  paymentTerminal?: PaymentTerminalConfig;
};

export type ShopOrgSettings = {
  brandName?: string;
  logoUrl?: string | null;
  nextBillSeq?: number;
  /** Bill sequence counter keyed by fiscal year label, e.g. { "26-27": 18 }. */
  billSeqByFy?: Record<string, number>;
  /**
   * Every business type this shop sells in. The `Organization.shopSector` column
   * stays the primary type for back-compat; this list drives category choices
   * and which product attributes the product form offers.
   */
  businessTypes?: string[];
  /** Free-text description when the org selected the OTHER business type. */
  customBusinessType?: string;
  invoice?: ShopInvoiceSettings;
};

export type ShopLabelBranding = {
  shopName: string;
  brandName: string;
  logoUrl: string | null;
};

export type LabelSize = "small" | "full";

/** What to show at the top of full-size tags */
export type FullLabelHeaderMode = "both" | "name" | "logo";

export type ResolvedInvoiceTemplate = {
  displayName: string;
  headerTitle: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  footerText: string;
  termsText: string | null;
  showLogo: boolean;
  showBarcode: boolean;
  showCashier: boolean;
  showSalesStaff: boolean;
  showCustomerPhone: boolean;
  showCustomerGstin: boolean;
  showPaymentMethod: boolean;
  showSubtotal: boolean;
  billPrefix: string;
  defaultTaxRatePercent: number;
  discountBasis: DiscountBasis;
  defaultStaffMonthlyTargetRupees: number;
  staffMonthlyTargets: Record<string, number>;
  paperSize: InvoicePaperSize;
  printMarginMm: number;
  defaultCopies: number;
  useDecimalPlaces: boolean;
  paymentTerminal: PaymentTerminalConfigPublic;
};

export const DEFAULT_INVOICE_SETTINGS: Required<
  Pick<
    ShopInvoiceSettings,
    | "headerTitle"
    | "footerText"
    | "showLogo"
    | "showBarcode"
    | "showCashier"
    | "showSalesStaff"
    | "showCustomerPhone"
    | "showCustomerGstin"
    | "showPaymentMethod"
    | "showSubtotal"
    | "billPrefix"
    | "defaultTaxRatePercent"
    | "discountBasis"
    | "paperSize"
    | "printMarginMm"
    | "defaultCopies"
    | "useDecimalPlaces"
  >
> = {
  headerTitle: "Tax Invoice / Retail Bill",
  footerText: "Thank you for your purchase",
  showLogo: true,
  showBarcode: true,
  showCashier: true,
  showSalesStaff: true,
  showCustomerPhone: true,
  showCustomerGstin: true,
  showPaymentMethod: true,
  showSubtotal: true,
  billPrefix: "INV",
  defaultTaxRatePercent: 0,
  discountBasis: "subtotal",
  paperSize: "80mm",
  printMarginMm: 0,
  defaultCopies: 1,
  useDecimalPlaces: true,
};

const INVOICE_PAPER_SIZES: InvoicePaperSize[] = ["58mm", "80mm", "A4"];

export function parseInvoicePaperSize(value: unknown): InvoicePaperSize | undefined {
  return INVOICE_PAPER_SIZES.includes(value as InvoicePaperSize)
    ? (value as InvoicePaperSize)
    : undefined;
}

export function defaultPrintMarginForPaper(paperSize: InvoicePaperSize): number {
  return paperSize === "A4" ? 10 : 0;
}

function readShopRaw(settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== "object") return {};
  const root = settings as Record<string, unknown>;
  const shop = root.shop;
  if (!shop || typeof shop !== "object") return {};
  return shop as Record<string, unknown>;
}

export function parseShopInvoiceSettings(settings: unknown): ShopInvoiceSettings {
  const raw = readShopRaw(settings).invoice;
  if (!raw || typeof raw !== "object") return {};
  const i = raw as Record<string, unknown>;
  return {
    headerTitle: typeof i.headerTitle === "string" ? i.headerTitle : undefined,
    displayName: typeof i.displayName === "string" ? i.displayName : undefined,
    address: typeof i.address === "string" ? i.address : undefined,
    phone: typeof i.phone === "string" ? i.phone : undefined,
    email: typeof i.email === "string" ? i.email : undefined,
    gstin: typeof i.gstin === "string" ? i.gstin : undefined,
    footerText: typeof i.footerText === "string" ? i.footerText : undefined,
    termsText: typeof i.termsText === "string" ? i.termsText : undefined,
    showLogo: typeof i.showLogo === "boolean" ? i.showLogo : undefined,
    showBarcode: typeof i.showBarcode === "boolean" ? i.showBarcode : undefined,
    showCashier: typeof i.showCashier === "boolean" ? i.showCashier : undefined,
    showSalesStaff: typeof i.showSalesStaff === "boolean" ? i.showSalesStaff : undefined,
    showCustomerPhone:
      typeof i.showCustomerPhone === "boolean" ? i.showCustomerPhone : undefined,
    showCustomerGstin:
      typeof i.showCustomerGstin === "boolean" ? i.showCustomerGstin : undefined,
    showPaymentMethod:
      typeof i.showPaymentMethod === "boolean" ? i.showPaymentMethod : undefined,
    showSubtotal: typeof i.showSubtotal === "boolean" ? i.showSubtotal : undefined,
    storeCode: typeof i.storeCode === "string" ? i.storeCode : undefined,
    billPrefix: typeof i.billPrefix === "string" ? i.billPrefix : undefined,
    defaultTaxRatePercent:
      typeof i.defaultTaxRatePercent === "number" ? i.defaultTaxRatePercent : undefined,
    discountBasis:
      i.discountBasis === "total" || i.discountBasis === "subtotal"
        ? i.discountBasis
        : undefined,
    defaultStaffMonthlyTargetRupees:
      typeof i.defaultStaffMonthlyTargetRupees === "number"
        ? i.defaultStaffMonthlyTargetRupees
        : undefined,
    staffMonthlyTargets:
      i.staffMonthlyTargets && typeof i.staffMonthlyTargets === "object"
        ? (i.staffMonthlyTargets as Record<string, number>)
        : undefined,
    paperSize: parseInvoicePaperSize(i.paperSize),
    printMarginMm:
      typeof i.printMarginMm === "number" && i.printMarginMm >= 0
        ? i.printMarginMm
        : undefined,
    defaultCopies:
      typeof i.defaultCopies === "number" &&
      i.defaultCopies >= 1 &&
      i.defaultCopies <= 5
        ? Math.round(i.defaultCopies)
        : undefined,
    useDecimalPlaces:
      typeof i.useDecimalPlaces === "boolean" ? i.useDecimalPlaces : undefined,
    paymentTerminal: i.paymentTerminal
      ? parsePaymentTerminalConfig(i.paymentTerminal)
      : undefined,
  };
}

export function parseShopOrgSettings(settings: unknown): ShopOrgSettings {
  const s = readShopRaw(settings);
  const invoice = parseShopInvoiceSettings(settings);
  return {
    brandName: typeof s.brandName === "string" ? s.brandName : undefined,
    logoUrl: typeof s.logoUrl === "string" ? s.logoUrl : null,
    nextBillSeq: typeof s.nextBillSeq === "number" ? s.nextBillSeq : undefined,
    businessTypes: Array.isArray(s.businessTypes)
      ? s.businessTypes.filter((t): t is string => typeof t === "string" && !!t)
      : undefined,
    customBusinessType:
      typeof s.customBusinessType === "string" && s.customBusinessType.trim()
        ? s.customBusinessType.trim()
        : undefined,
    invoice: Object.keys(invoice).length > 0 ? invoice : undefined,
  };
}

/**
 * Business types for the org, newest multi-select taking precedence and the
 * legacy single `shopSector` column as the fallback. Always non-empty.
 */
export function resolveShopBusinessTypes(
  settings: unknown,
  primarySector: string | null | undefined
): string[] {
  const fromSettings = parseShopOrgSettings(settings).businessTypes ?? [];
  if (fromSettings.length > 0) {
    // Keep the primary sector first so category ordering stays predictable.
    if (primarySector && fromSettings.includes(primarySector)) {
      return [primarySector, ...fromSettings.filter((t) => t !== primarySector)];
    }
    return fromSettings;
  }
  return [primarySector || "GENERAL"];
}

export function resolveCustomBusinessTypeLabel(settings: unknown): string | null {
  return parseShopOrgSettings(settings).customBusinessType ?? null;
}

export function resolveShopLabelBranding(
  shopName: string,
  settings: unknown
): ShopLabelBranding {
  const shop = parseShopOrgSettings(settings);
  return {
    shopName,
    brandName: shop.brandName?.trim() || shopName,
    logoUrl: shop.logoUrl?.trim() || null,
  };
}

export function resolveShopInvoiceTemplate(
  shopName: string,
  settings: unknown
): ResolvedInvoiceTemplate {
  const shop = parseShopOrgSettings(settings);
  const invoice = shop.invoice ?? {};
  const branding = resolveShopLabelBranding(shopName, settings);

  return {
    displayName:
      invoice.displayName?.trim() ||
      branding.brandName ||
      shopName,
    headerTitle:
      invoice.headerTitle?.trim() || DEFAULT_INVOICE_SETTINGS.headerTitle,
    logoUrl: branding.logoUrl,
    address: invoice.address?.trim() || null,
    phone: invoice.phone?.trim() || null,
    email: invoice.email?.trim() || null,
    gstin: invoice.gstin?.trim() || null,
    footerText:
      invoice.footerText?.trim() || DEFAULT_INVOICE_SETTINGS.footerText,
    termsText: invoice.termsText?.trim() || null,
    showLogo: invoice.showLogo ?? DEFAULT_INVOICE_SETTINGS.showLogo,
    showBarcode: invoice.showBarcode ?? DEFAULT_INVOICE_SETTINGS.showBarcode,
    showCashier: invoice.showCashier ?? DEFAULT_INVOICE_SETTINGS.showCashier,
    showSalesStaff: invoice.showSalesStaff ?? DEFAULT_INVOICE_SETTINGS.showSalesStaff,
    showCustomerPhone:
      invoice.showCustomerPhone ?? DEFAULT_INVOICE_SETTINGS.showCustomerPhone,
    showCustomerGstin:
      invoice.showCustomerGstin ?? DEFAULT_INVOICE_SETTINGS.showCustomerGstin,
    showPaymentMethod:
      invoice.showPaymentMethod ?? DEFAULT_INVOICE_SETTINGS.showPaymentMethod,
    showSubtotal: invoice.showSubtotal ?? DEFAULT_INVOICE_SETTINGS.showSubtotal,
    billPrefix:
      invoice.billPrefix?.trim().toUpperCase() ||
      DEFAULT_INVOICE_SETTINGS.billPrefix,
    defaultTaxRatePercent:
      invoice.defaultTaxRatePercent ?? DEFAULT_INVOICE_SETTINGS.defaultTaxRatePercent,
    discountBasis:
      invoice.discountBasis ?? DEFAULT_INVOICE_SETTINGS.discountBasis,
    defaultStaffMonthlyTargetRupees:
      invoice.defaultStaffMonthlyTargetRupees ?? 0,
    staffMonthlyTargets: invoice.staffMonthlyTargets ?? {},
    paperSize: invoice.paperSize ?? DEFAULT_INVOICE_SETTINGS.paperSize,
    printMarginMm:
      invoice.printMarginMm ?? defaultPrintMarginForPaper(
        invoice.paperSize ?? DEFAULT_INVOICE_SETTINGS.paperSize
      ),
    defaultCopies: invoice.defaultCopies ?? DEFAULT_INVOICE_SETTINGS.defaultCopies,
    useDecimalPlaces:
      invoice.useDecimalPlaces ?? DEFAULT_INVOICE_SETTINGS.useDecimalPlaces,
    paymentTerminal: sanitizePaymentTerminalConfig(
      invoice.paymentTerminal ?? parsePaymentTerminalConfig({})
    ),
  };
}

function mergeInvoiceSettings(
  prev: ShopInvoiceSettings,
  patch: Partial<ShopInvoiceSettings>
): ShopInvoiceSettings {
  const next: ShopInvoiceSettings = { ...prev };
  for (const [key, value] of Object.entries(patch) as Array<
    [keyof ShopInvoiceSettings, ShopInvoiceSettings[keyof ShopInvoiceSettings]]
  >) {
    if (value === undefined) continue;
    if (key === "discountBasis") {
      if (value === "subtotal" || value === "total") {
        next.discountBasis = value;
      }
      continue;
    }
    if (key === "paperSize") {
      const parsed = parseInvoicePaperSize(value);
      if (parsed) next.paperSize = parsed;
      continue;
    }
    if (key === "paymentTerminal") {
      if (value && typeof value === "object") {
        const merged = mergePaymentTerminalConfig(
          prev.paymentTerminal,
          value as Partial<PaymentTerminalConfig>
        );
        if (merged) next.paymentTerminal = merged;
        else delete next.paymentTerminal;
      }
      continue;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (key === "billPrefix") {
        next.billPrefix = trimmed.toUpperCase() || DEFAULT_INVOICE_SETTINGS.billPrefix;
      } else if (key === "storeCode") {
        const code = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
        if (code) {
          next.storeCode = code;
        } else {
          delete next.storeCode;
        }
      } else if (trimmed) {
        (next as Record<string, string>)[key] = trimmed;
      } else {
        delete next[key];
      }
    } else if (typeof value === "number") {
      (next as Record<string, number>)[key] = value;
    } else if (typeof value === "boolean") {
      (next as Record<string, boolean>)[key] = value;
    } else if (value && typeof value === "object") {
      (next as Record<string, Record<string, number>>)[key] = value as Record<
        string,
        number
      >;
    }
  }
  return next;
}

export function mergeShopOrgSettings(
  existingSettings: Record<string, unknown>,
  shopPatch: Partial<ShopOrgSettings>
): Record<string, unknown> {
  const prevRaw = readShopRaw(existingSettings);
  const prev = parseShopOrgSettings(existingSettings);
  const nextShop: Record<string, unknown> = { ...prevRaw };

  if (shopPatch.brandName !== undefined) {
    nextShop.brandName = shopPatch.brandName.trim() || undefined;
    if (!nextShop.brandName) delete nextShop.brandName;
  }
  if (shopPatch.logoUrl !== undefined) {
    nextShop.logoUrl = shopPatch.logoUrl?.trim() || null;
  }
  if (shopPatch.businessTypes !== undefined) {
    const unique = [...new Set(shopPatch.businessTypes.filter(Boolean))];
    if (unique.length > 0) {
      nextShop.businessTypes = unique;
    } else {
      delete nextShop.businessTypes;
    }
  }
  if (shopPatch.customBusinessType !== undefined) {
    const trimmed = shopPatch.customBusinessType?.trim();
    if (trimmed) {
      nextShop.customBusinessType = trimmed;
    } else {
      delete nextShop.customBusinessType;
    }
  }
  if (shopPatch.invoice !== undefined) {
    const merged = mergeInvoiceSettings(prev.invoice ?? {}, shopPatch.invoice);
    if (Object.keys(merged).length > 0) {
      nextShop.invoice = merged;
    } else {
      delete nextShop.invoice;
    }
  }

  return {
    ...existingSettings,
    shop: nextShop,
  };
}

/** Remove payment-terminal secrets before settings reach the browser. */
export function sanitizeShopSettingsForClient(
  settings: Record<string, unknown>
): Record<string, unknown> {
  const shop = settings.shop;
  if (!shop || typeof shop !== "object") return settings;
  const shopObj = shop as Record<string, unknown>;
  const invoice = shopObj.invoice;
  if (!invoice || typeof invoice !== "object") return settings;

  const inv = invoice as Record<string, unknown>;
  const terminal = inv.paymentTerminal;
  if (!terminal || typeof terminal !== "object") return settings;

  const parsed = parsePaymentTerminalConfig(terminal);
  return {
    ...settings,
    shop: {
      ...shopObj,
      invoice: {
        ...inv,
        paymentTerminal: sanitizePaymentTerminalConfig(parsed),
      },
    },
  };
}
