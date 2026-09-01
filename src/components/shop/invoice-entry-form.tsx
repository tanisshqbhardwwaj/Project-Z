"use client";

import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { apiFetch, apiFetchRaw } from "@/lib/api/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query/keys";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR, paiseToRupees } from "@/lib/finance/money";
import {
  availableQtyForInventoryLine,
  formatStockLabel,
  stockLimitMessage,
  validateCartStock,
} from "@/lib/shop/inventory";
import {
  type SaleLine,
  PAYMENT_METHODS,
  lineTotal,
  mergeCarts,
  mergeLineIntoCart,
  newLineId,
} from "@/lib/shop/invoice-cart";
import { buildDraftInvoice } from "@/components/shop/invoice-live-preview";
import type { ShopInvoiceData } from "@/components/shop/shop-invoice-print";
import { parsePricingJson } from "@/lib/shop/invoice-pricing";
import {
  CustomerPicker,
  type ShopCustomerOption,
} from "@/components/shop/customer-picker";
import { useShopInvoiceTemplate } from "@/hooks/use-shop-invoice-template";
import { usePaymentTerminalCollect } from "@/hooks/use-payment-terminal-collect";
import { isTerminalConfigured } from "@/lib/shop/payment-terminal";
import type { TerminalCollectOutcome } from "@/hooks/use-payment-terminal-collect";
import {
  computeInvoicePricing,
  formatInvoiceMoney,
  resolveInvoiceLineAllocations,
  shouldShowLineDiscountHints,
} from "@/lib/shop/invoice-pricing";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CameraScanButton } from "@/components/shop/camera-scan-button";
import { Banknote, CreditCard, Loader2, Minus, PauseCircle, Plus, Printer, Receipt, ScanLine, ShoppingBag, Smartphone, Tag } from "lucide-react";
import Link from "next/link";
import { OfferPickerDialog } from "@/components/shop/offer-picker-dialog";
import {
  CashTenderPanel,
  buildCashTender,
} from "@/components/shop/cash-tender-panel";
import type { CashTender } from "@/lib/shop/invoice-receipt-print";
import { useKeepAwake } from "@/hooks/use-keep-awake";
import { useToast } from "@/hooks/use-toast";

const SCAN_ADD_ITEM_KEY = "project-z:scan-add-item";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  clearInvoiceDraft,
  loadInvoiceDraft,
  saveInvoiceDraft,
} from "@/lib/shop/invoice-draft-storage";
import {
  VariantSearchPicker,
  VariantSelect,
  variantOptionText,
} from "@/components/shop/variant-picker";
import { saleLineItems, saleLinesToDraftCart } from "@/lib/shop/sale-invoice-mapper";
import { resolveShopBusinessTypes } from "@/lib/org/shop-settings";
import {
  catalogLabelForSectors,
  hasMenuBilling,
  hasServiceCatalog,
  type ShopItemKind,
} from "@/lib/shop/sector-mode";
import {
  filterInventoryForCatalog,
  InvoiceCatalogPicker,
  type CatalogCategory,
} from "@/components/shop/invoice-catalog-picker";
import { getModuleDefinition, moduleLabel, moduleRoute } from "@/lib/org/modules";
import { getActiveBranchId } from "@/lib/api/client";
import { parseKotPayload, type KotPayload } from "@/lib/shop/kot";
import { variantSubtitle } from "@/lib/shop/variant-display";
import { useKotPrint } from "@/components/shop/kot-print";
import { InvoiceCartTable } from "@/components/shop/invoice-cart-table";
import {
  FIELD_LIMITS,
  GSTIN_HINT,
  firstValidationIssue,
  requireCustomerNameOptional,
  requireGstinOptional,
  requirePhoneOptional,
} from "@/lib/api/validation";
import { normalizeGstin } from "@/lib/validation/fields";

function FormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function validateInvoiceCustomerFields(input: {
  customerName: string;
  customerPhone: string;
  customerGstin: string;
}): string | null {
  return firstValidationIssue([
    requireCustomerNameOptional(input.customerName),
    requirePhoneOptional(input.customerPhone),
    requireGstinOptional(input.customerGstin),
  ]);
}

const PAYMENT_OPTIONS: Array<{
  value: (typeof PAYMENT_METHODS)[number];
  label: string;
  icon: typeof Banknote;
}> = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "UPI", label: "UPI", icon: Smartphone },
  { value: "CARD", label: "Card", icon: CreditCard },
];

type ShopSaleResult = {
  id: string;
  billNumber: string | null;
  customerId?: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerGstin: string | null;
  staffId?: string | null;
  salesBoyName: string | null;
  notes: string | null;
  totalPaise: string;
  gstPaise?: string;
  paymentMethod: string;
  createdAt: string;
  itemsJson: {
    name: string;
    qty: number;
    priceRupees: number;
    inventoryItemId?: string;
    productId?: string;
    barcode?: string;
    sku?: string;
    size?: string;
    color?: string;
    variantLabel?: string;
    unit?: string;
  }[];
  pricingJson?: unknown;
  organization?: { name: string } | null;
  createdBy?: { name: string } | null;
  /** Local-first saves use `items` on the response instead of `itemsJson`. */
  items?: ShopSaleResult["itemsJson"];
  kotJson?: unknown;
};

type InventoryItem = {
  id: string;
  name: string;
  barcode: string | null;
  sku: string | null;
  size: string | null;
  color: string | null;
  variantLabel: string | null;
  quantity: number;
  sellPaise: string | null;
  unit: string;
  description?: string | null;
  product?: {
    id: string;
    name: string;
    brand: string | null;
    categoryKey?: string | null;
    subCategoryKey?: string | null;
    itemKind?: ShopItemKind | null;
  } | null;
};

type StaffOption = { id: string; name: string; roleTitle: string };

type InvoiceEntryFormProps = {
  onDraftChange: (draft: ShopInvoiceData) => void;
  onSaved: (
    sale: ShopSaleResult,
    invoice: ShopInvoiceData,
    cashTender?: CashTender | null,
    options?: { print?: boolean; kot?: KotPayload | null }
  ) => void;
  resetKey?: number;
  duplicateSaleId?: string | null;
};

export function InvoiceEntryForm({
  onDraftChange,
  onSaved,
  resetKey = 0,
  duplicateSaleId = null,
}: InvoiceEntryFormProps) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const orgName = useAuthStore((s) => s.activeOrganizationName);
  const activeBusinessType = useAuthStore((s) => s.activeBusinessType);
  const activeShopSector = useAuthStore((s) => s.activeShopSector);
  const activeOrgSettings = useAuthStore((s) => s.activeOrgSettings);
  const userName = useAuthStore((s) => s.user?.name);
  const { enabledModules } = useAuthStore();
  const inventoryEnabled = isModuleEnabled(enabledModules, "shop_inventory");
  const udhaarEnabled = isModuleEnabled(enabledModules, "shop_udhaar");
  const staffEnabled = isModuleEnabled(enabledModules, "staff");
  const invoiceTemplate = useShopInvoiceTemplate();
  const terminalConfig = invoiceTemplate.paymentTerminal;
  const terminalReady = isTerminalConfigured(terminalConfig);
  const {
    collecting: terminalCollecting,
    hint: terminalHint,
    collectPayment,
    cancelCollect,
  } = usePaymentTerminalCollect();
  useKeepAwake(true);
  const { toast } = useToast();
  const printAfterSaveRef = useRef(true);
  const { queueKotPrint, printKot, KotPrintLayer } = useKotPrint();

  const shopBusinessTypes = useMemo(
    () => resolveShopBusinessTypes(activeOrgSettings?.shop, activeShopSector),
    [activeOrgSettings?.shop, activeShopSector]
  );
  const showCatalogTabs =
    inventoryEnabled &&
    hasMenuBilling(shopBusinessTypes) &&
    !hasServiceCatalog(shopBusinessTypes);
  const usesServiceCatalog = hasServiceCatalog(shopBusinessTypes);
  const catalogSectionLabel = catalogLabelForSectors(shopBusinessTypes);
  const inventoryModuleLabel = moduleLabel(
    "shop_inventory",
    activeBusinessType ?? "SHOPKEEPER",
    shopBusinessTypes
  );
  const inventoryCatalogHref =
    getModuleDefinition("shop_inventory") != null
      ? moduleRoute(getModuleDefinition("shop_inventory")!, activeBusinessType ?? "SHOPKEEPER")
      : "/shop/inventory";
  const activeBranchId = getActiveBranchId();

  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const qc = useQueryClient();
  const scanRef = useRef<HTMLInputElement>(null);
  const restoreOfferRef = useRef<{
    selectedOfferId: string | null;
    settled: boolean;
  } | null>(null);
  const promptedCartKeyRef = useRef<string | null>(null);
  const saleClientIdRef = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sale-${Date.now()}`
  );
  const serverInventoryCache = useRef(new Map<string, InventoryItem>());
  const prevResetKeyRef = useRef(resetKey);
  const draftRestoredRef = useRef(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [salesBoyName, setSalesBoyName] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [cart, setCart] = useState<SaleLine[]>([]);
  const [itemName, setItemName] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [showStockSearch, setShowStockSearch] = useState(false);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [splitPayment, setSplitPayment] = useState(false);
  const [splitCashRupees, setSplitCashRupees] = useState("");
  const [splitUpiRupees, setSplitUpiRupees] = useState("");
  const [paidRupees, setPaidRupees] = useState("");
  const [cashReceivedRupees, setCashReceivedRupees] = useState("");
  const [discountMode, setDiscountMode] = useState<"rupees" | "percent">("rupees");
  const [discountRupees, setDiscountRupees] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState("");
  const [taxIncluded, setTaxIncluded] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [offerSelectionSettled, setOfferSelectionSettled] = useState(false);
  const [offerPickerOpen, setOfferPickerOpen] = useState(false);
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null);
  const [catalogCategoryKey, setCatalogCategoryKey] = useState("");
  const [catalogSubCategoryKey, setCatalogSubCategoryKey] = useState("");

  const cartOfferKey = useMemo(
    () =>
      cart
        .map((l) => `${l.inventoryItemId ?? l.name}:${l.qty}:${l.priceRupees}`)
        .join("|"),
    [cart]
  );
  const debouncedCartOfferKey = useDebouncedValue(cartOfferKey, 250);

  useEffect(() => {
    if (taxRatePercent === "" && invoiceTemplate.defaultTaxRatePercent > 0) {
      setTaxRatePercent(String(invoiceTemplate.defaultTaxRatePercent));
    }
  }, [invoiceTemplate.defaultTaxRatePercent, taxRatePercent]);

  useEffect(() => {
    if (prevResetKeyRef.current === resetKey) return;
    prevResetKeyRef.current = resetKey;
    if (orgId) clearInvoiceDraft(orgId);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerGstin("");
    setSelectedCustomerId(null);
    setSalesBoyName("");
    setDiscountMode("rupees");
    setDiscountRupees("");
    setDiscountPercent("");
    setTaxRatePercent(
      invoiceTemplate.defaultTaxRatePercent > 0
        ? String(invoiceTemplate.defaultTaxRatePercent)
        : ""
    );
    setTaxIncluded(false);
    setCart([]);
    setItemName("");
    setQty("1");
    setPrice("");
    setScanInput("");
    setSelectedInventoryId("");
    setPaymentMethod("CASH");
    setPaidRupees("");
    setCashReceivedRupees("");
    setSelectedOfferId(null);
    setOfferSelectionSettled(false);
    setOfferPickerOpen(false);
    setPendingOfferId(null);
    clear();
  }, [resetKey, clear, orgId, invoiceTemplate.defaultTaxRatePercent]);

  useEffect(() => {
    draftRestoredRef.current = false;
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    try {
      const raw = sessionStorage.getItem(SCAN_ADD_ITEM_KEY);
      if (!raw) return;
      sessionStorage.removeItem(SCAN_ADD_ITEM_KEY);
      const item = JSON.parse(raw) as Omit<SaleLine, "id">;
      setCart((prev) =>
        mergeLineIntoCart(prev, {
          name: item.name,
          qty: item.qty,
          priceRupees: item.priceRupees,
          inventoryItemId: item.inventoryItemId,
          productId: item.productId,
          barcode: item.barcode,
          sku: item.sku,
          size: item.size,
          color: item.color,
          variantLabel: item.variantLabel,
          unit: item.unit,
        })
      );
      toast({
        title: "Added from scan",
        description: item.name,
        variant: "success",
      });
    } catch {
      /* ignore malformed scan payload */
    }
  }, [orgId, toast]);

  useEffect(() => {
    if (!orgId || !duplicateSaleId) return;
    let cancelled = false;
    void apiFetch<ShopSaleResult>(`/api/v1/shop/sales/${duplicateSaleId}`)
      .then((sale) => {
        if (cancelled) return;
        setCustomerName(sale.customerName ?? "");
        setCustomerPhone(sale.customerPhone ?? "");
        setCustomerGstin(sale.customerGstin ?? "");
        setSelectedCustomerId(sale.customerId ?? null);
        setSalesBoyName(sale.salesBoyName ?? "");
        setSelectedStaffId(sale.staffId ?? "");
        setPaymentMethod(sale.paymentMethod ?? "CASH");
        const pricing = parsePricingJson(sale.pricingJson);
        if (pricing) {
          if ((pricing.discountPercent ?? 0) > 0) {
            setDiscountMode("percent");
            setDiscountPercent(String(pricing.discountPercent));
          } else if ((pricing.discountRupees ?? 0) > 0) {
            setDiscountMode("rupees");
            setDiscountRupees(String(pricing.discountRupees));
          }
          setTaxRatePercent(String(pricing.taxRatePercent ?? ""));
          setTaxIncluded(Boolean(pricing.taxIncluded));
        }
        setCart(
          saleLineItems(sale).map((line) => ({
            id: newLineId(),
            name: line.name,
            qty: line.qty,
            priceRupees: line.priceRupees,
            inventoryItemId: line.inventoryItemId,
            productId: line.productId,
            barcode: line.barcode,
            sku: line.sku,
            size: line.size ?? undefined,
            color: line.color ?? undefined,
            variantLabel: line.variantLabel ?? undefined,
            unit: line.unit,
          }))
        );
        toast({
          title: "Bill duplicated",
          description: "Review items and save as a new invoice",
          variant: "success",
        });
      })
      .catch(() => {
        toast({
          title: "Could not duplicate bill",
          variant: "destructive",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, duplicateSaleId, toast]);

  useEffect(() => {
    if (!orgId || draftRestoredRef.current) return;
    draftRestoredRef.current = true;
    const saved = loadInvoiceDraft(orgId);
    if (!saved) return;
    restoreOfferRef.current = {
      selectedOfferId: saved.selectedOfferId,
      settled: saved.offerSelectionSettled,
    };
    setCustomerName(saved.customerName);
    setCustomerPhone(saved.customerPhone);
    setCustomerGstin(saved.customerGstin);
    setSelectedCustomerId(saved.selectedCustomerId);
    setSalesBoyName(saved.salesBoyName);
    setCart(
      saved.cart.map((line) => ({
        ...line,
        id: line.id || newLineId(),
      }))
    );
    setDiscountMode(saved.discountMode);
    setDiscountRupees(saved.discountRupees);
    setDiscountPercent(saved.discountPercent);
    setTaxRatePercent(saved.taxRatePercent);
    setTaxIncluded(saved.taxIncluded);
    setPaymentMethod(saved.paymentMethod);
    setPaidRupees(saved.paidRupees);
    setCashReceivedRupees(saved.cashReceivedRupees);
    showWarning("Draft restored — continue billing where you left off");
  }, [orgId, showWarning]);

  useEffect(() => {
    if (!orgId) return;
    if (cart.length === 0) {
      clearInvoiceDraft(orgId);
      return;
    }
    const timer = window.setTimeout(() => {
      saveInvoiceDraft(orgId, {
        customerName,
        customerPhone,
        customerGstin,
        selectedCustomerId,
        salesBoyName,
        cart,
        discountMode,
        discountRupees,
        discountPercent,
        taxRatePercent,
        taxIncluded,
        paymentMethod,
        paidRupees,
        cashReceivedRupees,
        selectedOfferId,
        offerSelectionSettled,
        savedAt: Date.now(),
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    orgId,
    cart,
    customerName,
    customerPhone,
    customerGstin,
    selectedCustomerId,
    salesBoyName,
    discountMode,
    discountRupees,
    discountPercent,
    taxRatePercent,
    taxIncluded,
    paymentMethod,
    paidRupees,
    cashReceivedRupees,
    selectedOfferId,
    offerSelectionSettled,
  ]);

  useEffect(() => {
    const restored = restoreOfferRef.current;
    restoreOfferRef.current = null;
    setSelectedOfferId(restored ? restored.selectedOfferId : null);
    setOfferSelectionSettled(restored ? restored.settled : false);
    setOfferPickerOpen(false);
    setPendingOfferId(null);
    promptedCartKeyRef.current = restored?.settled ? cartOfferKey : null;
  }, [cartOfferKey]);

  const inventoryQuery = useQuery({
    queryKey: orgId
      ? [...queryKeys.modules.shop.inventory(orgId, activeBranchId), "billing"]
      : ["disabled"],
    queryFn: async () => {
      const json = await apiFetchRaw<{
        data: InventoryItem[];
        meta?: { totalCount?: number; searchMode?: boolean };
      }>("/api/v1/shop/inventory?for=billing");
      return {
        items: json.data ?? [],
        searchMode: json.meta?.searchMode ?? false,
        totalCount: json.meta?.totalCount ?? json.data?.length ?? 0,
      };
    },
    enabled: !!orgId && inventoryEnabled,
  });

  const inventoryLoadError =
    inventoryQuery.error instanceof Error ? inventoryQuery.error.message : null;

  const inventorySearchMode = inventoryQuery.data?.searchMode ?? false;
  const inventoryTotalCount = inventoryQuery.data?.totalCount ?? 0;

  const searchInventoryOnServer = useCallback(async (q: string) => {
    const json = await apiFetchRaw<{ data: InventoryItem[] }>(
      `/api/v1/shop/inventory?q=${encodeURIComponent(q)}&limit=40`
    );
    const items = json.data ?? [];
    for (const item of items) {
      serverInventoryCache.current.set(item.id, item);
    }
    return items;
  }, []);

  const categoriesQuery = useQuery({
    queryKey: orgId ? [...queryKeys.modules.shop.inventory(orgId), "categories"] : ["disabled"],
    queryFn: () =>
      apiFetch<{ categories: CatalogCategory[] }>("/api/v1/shop/categories"),
    enabled: !!orgId && inventoryEnabled && showCatalogTabs,
  });

  const pickableInventory = useMemo(() => {
    const all = inventoryQuery.data?.items ?? [];
    if (!showCatalogTabs) return all;
    return filterInventoryForCatalog(all, catalogCategoryKey, catalogSubCategoryKey);
  }, [
    inventoryQuery.data?.items,
    showCatalogTabs,
    catalogCategoryKey,
    catalogSubCategoryKey,
  ]);

  const useInventorySearchPicker = inventorySearchMode || showStockSearch;
  const showInventoryPicker =
    inventoryEnabled &&
    (inventoryQuery.isLoading ||
      pickableInventory.length > 0 ||
      inventorySearchMode ||
      inventoryTotalCount > 0);

  const resolveInventoryItem = useCallback(
    (itemId: string) =>
      pickableInventory.find((i) => i.id === itemId) ??
      (inventoryQuery.data?.items ?? []).find((i) => i.id === itemId) ??
      serverInventoryCache.current.get(itemId),
    [pickableInventory, inventoryQuery.data?.items]
  );

  useEffect(() => {
    if (inventorySearchMode) {
      setShowStockSearch(true);
    }
  }, [inventorySearchMode]);

  const staffQuery = useQuery({
    queryKey: orgId ? queryKeys.staff.list(orgId, "ACTIVE") : ["disabled"],
    queryFn: () => apiFetch<StaffOption[]>("/api/v1/staff?status=ACTIVE"),
    enabled: !!orgId && staffEnabled,
  });

  type DbHeldBill = {
    id: string;
    holdNumber: number;
    customerName: string | null;
    customerPhone: string | null;
    customerGstin: string | null;
    salesBoyName: string | null;
    customerId: string | null;
    cartJson: SaleLine[];
    pricingJson: Record<string, unknown>;
    expiresAt: string;
  };

  const heldBillsQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.heldBills(orgId) : ["disabled"],
    queryFn: () => apiFetch<DbHeldBill[]>("/api/v1/shop/held-bills"),
    enabled: !!orgId,
    refetchInterval: 60_000,
  });

  const heldBills = heldBillsQuery.data ?? [];

  const holdBillMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/held-bills", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      if (orgId) {
        clearInvoiceDraft(orgId);
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.heldBills(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.dashboard(orgId) });
      }
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerGstin("");
      setSalesBoyName("");
      setSelectedCustomerId(null);
      setSelectedOfferId(null);
      setOfferSelectionSettled(false);
      setOfferPickerOpen(false);
      setPendingOfferId(null);
    },
  });

  const resumeHoldMutation = useMutation({
    mutationFn: (heldBillId: string) =>
      apiFetch<DbHeldBill>("/api/v1/shop/held-bills", {
        method: "PATCH",
        body: JSON.stringify({ action: "resume", heldBillId }),
      }),
    onSuccess: (held) => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.heldBills(orgId) });
      }
      const lines = Array.isArray(held.cartJson) ? held.cartJson : [];
      setCart((prev) =>
        mergeCarts(
          prev,
          lines.map((l) => ({ ...l, id: l.id ?? newLineId() }))
        )
      );
      if (held.customerName) setCustomerName(held.customerName);
      if (held.customerPhone) setCustomerPhone(held.customerPhone);
      if (held.customerGstin) setCustomerGstin(held.customerGstin);
      if (held.salesBoyName) setSalesBoyName(held.salesBoyName);
      if (held.customerId) setSelectedCustomerId(held.customerId);
      const pricing = held.pricingJson ?? {};
      if (pricing.offerSelectionSettled === true) {
        const restoredOfferId =
          typeof pricing.selectedOfferId === "string" ? pricing.selectedOfferId : null;
        restoreOfferRef.current = { selectedOfferId: restoredOfferId, settled: true };
        setSelectedOfferId(restoredOfferId);
        setOfferSelectionSettled(true);
      }
      if (typeof pricing.discountMode === "string") {
        setDiscountMode(pricing.discountMode === "percent" ? "percent" : "rupees");
      }
      if (pricing.discountRupees != null) {
        setDiscountRupees(String(pricing.discountRupees));
      }
      if (pricing.discountPercent != null) {
        setDiscountPercent(String(pricing.discountPercent));
      }
      if (pricing.taxRatePercent != null) {
        setTaxRatePercent(String(pricing.taxRatePercent));
      }
      if (typeof pricing.taxIncluded === "boolean") {
        setTaxIncluded(pricing.taxIncluded);
      }
    },
  });

  const cancelHoldMutation = useMutation({
    mutationFn: (heldBillId: string) =>
      apiFetch("/api/v1/shop/held-bills", {
        method: "PATCH",
        body: JSON.stringify({ action: "cancel", heldBillId }),
      }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.modules.shop.heldBills(orgId) });
    },
  });

  const offerPreviewQuery = useQuery({
    queryKey: orgId
      ? [
          ...queryKeys.modules.shop.offers(orgId),
          "preview",
          debouncedCartOfferKey,
          selectedOfferId,
          offerSelectionSettled,
        ]
      : ["disabled"],
    queryFn: () =>
      apiFetch<{
        applicableOffers: { offerId: string; name: string; discountRupees: number }[];
        selectedOfferId: string | null;
        requiresSelection: boolean;
        offerDiscountRupees: number;
        lineDiscountRupees?: number[];
        offerDetails: { offerId: string; name: string; discountRupees: number }[];
      }>("/api/v1/shop/offers/preview", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((l) => ({
            name: l.name,
            qty: l.qty,
            priceRupees: l.priceRupees,
            inventoryItemId: l.inventoryItemId,
            barcode: l.barcode,
          })),
          selectedOfferId: offerSelectionSettled ? selectedOfferId : null,
          skipOffer: offerSelectionSettled && selectedOfferId === null,
        }),
      }),
    enabled: !!orgId && cart.length > 0,
  });

  const applicableOffers = offerPreviewQuery.data?.applicableOffers ?? [];
  const cartSubtotalRupees = useMemo(
    () => cart.reduce((s, l) => s + l.qty * l.priceRupees, 0),
    [cart]
  );

  useEffect(() => {
    const data = offerPreviewQuery.data;
    if (!data || cart.length === 0 || offerSelectionSettled) return;

    if (data.applicableOffers.length === 0) {
      setSelectedOfferId(null);
      setOfferSelectionSettled(true);
      return;
    }

    const best = data.applicableOffers[0]!;
    const wouldWipeBill = best.discountRupees >= cartSubtotalRupees - 0.005;

    if (data.applicableOffers.length === 1 && !wouldWipeBill) {
      setSelectedOfferId(best.offerId);
      setOfferSelectionSettled(true);
      return;
    }

    if (promptedCartKeyRef.current === cartOfferKey) return;
    promptedCartKeyRef.current = cartOfferKey;
    setPendingOfferId(wouldWipeBill ? null : best.offerId);
    setOfferPickerOpen(true);
  }, [offerPreviewQuery.data, cart.length, offerSelectionSettled, cartSubtotalRupees, cartOfferKey]);

  const offerDiscountRupees = offerPreviewQuery.data?.offerDiscountRupees ?? 0;
  const appliedOfferName = offerPreviewQuery.data?.offerDetails?.[0]?.name ?? null;
  const offerWouldWipeBill =
    offerDiscountRupees > 0 && offerDiscountRupees >= cartSubtotalRupees - 0.005;

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<ShopSaleResult>("/api/v1/shop/sales", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (sale) => {
      saleClientIdRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `sale-${Date.now()}`;
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.invoices(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.sales(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.dashboard(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.inventory(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.customerRegistry(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread(orgId) });
      }
      const savedLines = saleLineItems(sale);
      const invoice = buildDraftInvoice({
        orgName: sale.organization?.name ?? orgName ?? "Shop",
        cashierName: sale.createdBy?.name ?? userName ?? null,
        customerName: sale.customerName ?? customerName,
        customerPhone: sale.customerPhone ?? customerPhone,
        customerGstin: sale.customerGstin ?? customerGstin,
        salesBoyName: sale.salesBoyName ?? salesBoyName,
        paymentMethod: sale.paymentMethod ?? paymentMethod,
        cart:
          savedLines.length > 0
            ? saleLinesToDraftCart(savedLines)
            : cart.map((line) => ({
                name: line.name,
                qty: line.qty,
                priceRupees: line.priceRupees,
                size: line.size,
                color: line.color,
                variantLabel: line.variantLabel,
                sku: line.sku,
                barcode: line.barcode,
              })),
        billNumber: sale.billNumber,
        pricing,
        manualDiscountRupees,
        offerDiscountRupees,
        appliedOffers: offerPreviewQuery.data?.offerDetails,
        offerLineDiscountRupees: offerPreviewQuery.data?.lineDiscountRupees,
        manualDiscountMode: discountMode,
        manualDiscountPercent:
          discountMode === "percent" ? Number(discountPercent) || 0 : undefined,
      });
      if (sale.notes) {
        invoice.notes = sale.notes;
      }
      if (sale.createdAt) {
        invoice.createdAt = sale.createdAt;
      }
      const parsedPricing = parsePricingJson(sale.pricingJson);
      if (parsedPricing) {
        invoice.pricing = parsedPricing;
      }
      if (sale.totalPaise) {
        invoice.totalPaise = String(sale.totalPaise);
      }
      if (sale.gstPaise) {
        invoice.gstPaise = String(sale.gstPaise);
      }
      onSaved(
        sale,
        invoice,
        paymentMethod === "CASH" ? buildCashTender(cartTotal, cashReceivedRupees) : null,
        {
          print: printAfterSaveRef.current,
          kot: parseKotPayload(sale.kotJson),
        }
      );
      const kot = parseKotPayload(sale.kotJson);
      if (kot && printAfterSaveRef.current) {
        queueKotPrint(kot);
        window.requestAnimationFrame(() => {
          void printKot();
        });
      }
      toast({
        title: sale.billNumber ? `Invoice ${sale.billNumber} saved` : "Invoice saved",
        variant: "success",
      });
    },
  });

  function updateCartLineQty(lineId: string, delta: number) {
    const line = cart.find((l) => l.id === lineId);
    if (!line) return;
    const nextQty = Math.round((line.qty + delta) * 1000) / 1000;
    if (nextQty <= 0) {
      setCart((prev) => prev.filter((l) => l.id !== lineId));
      return;
    }
    if (line.inventoryItemId) {
      const label = variantSubtitle(line) || line.name;
      const available = availableQtyForInventoryLine(
        line.inventoryItemId,
        cart,
        inventoryQuery.data?.items ?? [],
        lineId
      );
      if (available === "unknown") {
        showWarning(`${label} is no longer in inventory`);
        return;
      }
      if (available !== "infinite" && nextQty > available) {
        const inv = (inventoryQuery.data?.items ?? []).find((i) => i.id === line.inventoryItemId);
        showWarning(stockLimitMessage(label, available, inv?.unit ?? line.unit ?? "pcs"));
        return;
      }
    }
    setCart((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, qty: nextQty } : l))
    );
  }

  const pricing = useMemo(
    () => {
      const subtotalRupees = cart.reduce((s, l) => s + l.qty * l.priceRupees, 0);
      let manualDiscountRupees = 0;
      if (discountMode === "percent") {
        manualDiscountRupees =
          Math.round(((subtotalRupees * (Number(discountPercent) || 0)) / 100) * 100) / 100;
      } else {
        manualDiscountRupees = Number(discountRupees) || 0;
      }
      return {
        manualDiscountRupees,
        ...computeInvoicePricing({
          items: cart,
          discountRupees: manualDiscountRupees + offerDiscountRupees,
          discountPercent: 0,
          taxRatePercent: Number(taxRatePercent) || 0,
          taxIncluded,
          discountBasis: invoiceTemplate.discountBasis,
          useDecimalPlaces: invoiceTemplate.useDecimalPlaces,
        }),
      };
    },
    [
      cart,
      discountMode,
      discountRupees,
      discountPercent,
      taxRatePercent,
      taxIncluded,
      invoiceTemplate.discountBasis,
      invoiceTemplate.useDecimalPlaces,
      offerDiscountRupees,
    ]
  );

  const lineDiscountMode = shouldShowLineDiscountHints(null, discountMode, offerDiscountRupees);
  const manualDiscountRupees = pricing.manualDiscountRupees;
  const cartLineAllocations = useMemo(() => {
    return resolveInvoiceLineAllocations(cart, {
      showLineHints: lineDiscountMode,
      totalDiscountRupees: pricing.discountRupees,
      manualDiscountRupees,
      manualDiscountMode: discountMode,
      offerLineDiscountRupees: offerPreviewQuery.data?.lineDiscountRupees,
    });
  }, [
    cart,
    lineDiscountMode,
    pricing.discountRupees,
    manualDiscountRupees,
    discountMode,
    offerPreviewQuery.data?.lineDiscountRupees,
  ]);

  const cartTotal = pricing.totalRupees;

  useEffect(() => {
    onDraftChange(
      buildDraftInvoice({
        orgName: orgName ?? "Shop",
        cashierName: userName,
        customerName,
        customerPhone,
        customerGstin,
        salesBoyName,
        paymentMethod,
        cart,
        pricing,
        manualDiscountRupees,
        offerDiscountRupees,
        appliedOffers: offerPreviewQuery.data?.offerDetails,
        offerLineDiscountRupees: offerPreviewQuery.data?.lineDiscountRupees,
        manualDiscountMode: discountMode,
        manualDiscountPercent:
          discountMode === "percent" ? Number(discountPercent) || 0 : undefined,
      })
    );
  }, [
    onDraftChange,
    orgName,
    userName,
    customerName,
    customerPhone,
    customerGstin,
    salesBoyName,
    paymentMethod,
    cart,
    pricing,
    manualDiscountRupees,
    offerDiscountRupees,
    offerPreviewQuery.data?.offerDetails,
    offerPreviewQuery.data?.lineDiscountRupees,
    discountMode,
    discountPercent,
  ]);

  function checkStock(
    inventoryItemId: string,
    addQty: number,
    nameForError: string,
    cartSource: SaleLine[] = cart
  ) {
    const available = availableQtyForInventoryLine(
      inventoryItemId,
      cartSource,
      inventoryQuery.data?.items ?? []
    );
    if (available === "unknown") {
      showWarning(`${nameForError} is no longer in inventory`);
      return false;
    }
    if (available === "infinite") return true;
    if (addQty > available) {
      const inv = (inventoryQuery.data?.items ?? []).find((i) => i.id === inventoryItemId);
      showWarning(stockLimitMessage(nameForError, available, inv?.unit ?? "pcs"));
      return false;
    }
    return true;
  }

  /** Copies the variant attributes onto the cart line, dropping empty ones. */
  function variantFieldsOf(item: InventoryItem) {
    return {
      productId: item.product?.id ?? undefined,
      barcode: item.barcode ?? undefined,
      sku: item.sku ?? undefined,
      size: item.size ?? undefined,
      color: item.color ?? undefined,
      variantLabel: item.variantLabel ?? undefined,
      unit: item.unit ?? undefined,
      itemKind: item.product?.itemKind ?? undefined,
    };
  }

  function addInventoryToCart(item: InventoryItem, qtyNum: number) {
    const label = variantOptionText(item);
    if (!checkStock(item.id, qtyNum, label)) return;
    const priceRupees = item.sellPaise
      ? paiseToRupees(BigInt(item.sellPaise))
      : 0;
    setCart((prev) =>
      mergeLineIntoCart(prev, {
        name: item.product?.name ?? item.name,
        qty: qtyNum,
        priceRupees,
        inventoryItemId: item.id,
        ...variantFieldsOf(item),
      })
    );
  }

  function pickInventoryItem(itemId: string) {
    setSelectedInventoryId(itemId);
    const item = resolveInventoryItem(itemId);
    if (!item) return;
    setItemName(variantOptionText(item));
    if (item.sellPaise) {
      setPrice(String(paiseToRupees(BigInt(item.sellPaise))));
    }
  }

  function addLineToCart() {
    clear();
    if (!itemName.trim()) return showWarning("Item name is required");
    const priceNum = Number(price);
    const qtyNum = Number(qty);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return showWarning("Enter a valid price");
    }
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      return showWarning("Enter a valid quantity");
    }
    if (selectedInventoryId && !checkStock(selectedInventoryId, qtyNum, itemName.trim())) {
      return;
    }
    const picked = selectedInventoryId
      ? resolveInventoryItem(selectedInventoryId)
      : undefined;
    setCart((prev) =>
      mergeLineIntoCart(prev, {
        name: picked?.product?.name ?? picked?.name ?? itemName.trim(),
        qty: qtyNum,
        priceRupees: priceNum,
        inventoryItemId: selectedInventoryId || undefined,
        ...(picked ? variantFieldsOf(picked) : {}),
      })
    );
    setItemName("");
    setPrice("");
    setQty("1");
    setSelectedInventoryId("");
  }

  async function handleBarcodeScan(code: string) {
    const trimmed = code.trim();
    if (!trimmed || !inventoryEnabled) return;
    try {
      const item = await apiFetch<InventoryItem>(
        `/api/v1/shop/inventory/lookup?barcode=${encodeURIComponent(trimmed)}`
      );
      const priceRupees = item.sellPaise
        ? paiseToRupees(BigInt(item.sellPaise))
        : 0;
      // A barcode maps to one variant, so this adds exactly the scanned size.
      setCart((prev) => {
        if (!checkStock(item.id, 1, variantOptionText(item), prev)) return prev;
        return mergeLineIntoCart(prev, {
          name: item.product?.name ?? item.name,
          qty: 1,
          priceRupees,
          inventoryItemId: item.id,
          ...variantFieldsOf(item),
        });
      });
      clear();
      setScanInput("");
      scanRef.current?.focus();
    } catch (err) {
      applyError(err, "No product for this barcode");
      setScanInput("");
      scanRef.current?.focus();
    }
  }

  async function holdCurrentBill() {
    if (cart.length === 0) return showWarning("Nothing on the bill to hold");
    const customerIssue = validateInvoiceCustomerFields({
      customerName,
      customerPhone,
      customerGstin,
    });
    if (customerIssue) return showWarning(customerIssue);
    const normalizedGstin = customerGstin.trim()
      ? normalizeGstin(customerGstin)
      : "";
    const snapshot = [...cart];
    const pricingSnapshot = {
      discountMode,
      discountRupees,
      discountPercent,
      taxRatePercent,
      taxIncluded,
      selectedOfferId,
      offerSelectionSettled,
    };
    try {
      await holdBillMutation.mutateAsync({
        customerId: selectedCustomerId,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        customerGstin: normalizedGstin || null,
        salesBoyName: salesBoyName.trim() || null,
        cartJson: snapshot,
        pricingJson: pricingSnapshot,
      });
      clear();
    } catch (err) {
      applyError(err, "Failed to hold bill");
    }
  }

  function formatRemainingMs(expiresAt: string) {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${String(secs).padStart(2, "0")} remaining`;
  }

  async function resumeHeldBill(heldId: string) {
    if (
      cart.length > 0 &&
      !window.confirm(
        "This will add the held items to your current bill. Continue?"
      )
    ) {
      return;
    }
    clear();
    try {
      await resumeHoldMutation.mutateAsync(heldId);
    } catch (err) {
      applyError(err, "Failed to resume held bill");
    }
  }

  async function cancelHeldBill(heldId: string) {
    try {
      await cancelHoldMutation.mutateAsync(heldId);
    } catch (err) {
      applyError(err, "Failed to cancel held bill");
    }
  }

  function applyOfferChoice(offerId: string | null) {
    setSelectedOfferId(offerId);
    setOfferSelectionSettled(true);
    setOfferPickerOpen(false);
  }

  function openOfferPicker() {
    const best = applicableOffers[0]?.offerId ?? null;
    setPendingOfferId(selectedOfferId ?? best);
    setOfferPickerOpen(true);
  }

  function confirmOfferPicker() {
    applyOfferChoice(pendingOfferId);
  }

  function removeOffer() {
    applyOfferChoice(null);
  }

  async function collectOnTerminal(): Promise<TerminalCollectOutcome | null> {
    if (!terminalReady) {
      showWarning("Configure a card machine in Invoice Settings first");
      return null;
    }
    if (paymentMethod !== "CARD" && paymentMethod !== "UPI") {
      showWarning("Select Card or UPI to collect on the machine");
      return null;
    }
    if (cartTotal <= 0) return null;
    try {
      const amountPaise = BigInt(Math.round(cartTotal * 100));
      return await collectPayment(amountPaise, paymentMethod as "CARD" | "UPI");
    } catch (err) {
      applyError(err, "Card machine payment failed");
      return null;
    }
  }

  async function completeSale(e: React.FormEvent, printAfterSave = true) {
    e.preventDefault();
    printAfterSaveRef.current = printAfterSave;
    clear();
    if (cart.length === 0) {
      return showWarning("Add at least one item to the invoice");
    }
    if (paymentMethod === "CREDIT" && !udhaarEnabled) {
      return showWarning(
        "Udhaar (credit ledger) is off. Turn it on in Manage Organization → Features."
      );
    }
    if (applicableOffers.length > 0 && !offerSelectionSettled) {
      setOfferPickerOpen(true);
      return showWarning("Choose an offer for this bill, or continue with no offer");
    }
    if (cartTotal <= 0) {
      if (offerWouldWipeBill) {
        setOfferPickerOpen(true);
        return showWarning("This offer makes the total ₹0. Change or remove it to complete the sale");
      }
      return showWarning("Invoice total must be greater than zero");
    }
    if (paymentMethod === "CASH" && !splitPayment) {
      const received = Number(cashReceivedRupees) || 0;
      if (received < cartTotal - 0.005) {
        return showWarning(`Enter cash received — at least ₹${cartTotal.toFixed(2)}`);
      }
    }
    if (splitPayment) {
      const cash = Number(splitCashRupees) || 0;
      const upi = Number(splitUpiRupees) || 0;
      if (Math.abs(cash + upi - cartTotal) > 0.02) {
        return showWarning(
          `Split payment must equal bill total (₹${cartTotal.toFixed(2)})`
        );
      }
    }
    if (inventoryEnabled && (inventoryQuery.data?.items ?? []).length > 0) {
      const stockCheck = validateCartStock(cart, inventoryQuery.data?.items ?? []);
      if (!stockCheck.ok) {
        return showWarning(stockCheck.message);
      }
    }

    const customerIssue = validateInvoiceCustomerFields({
      customerName,
      customerPhone,
      customerGstin,
    });
    if (customerIssue) return showWarning(customerIssue);
    const normalizedGstin = customerGstin.trim()
      ? normalizeGstin(customerGstin)
      : "";

    let resolvedPaymentMethod = splitPayment ? "UPI" : paymentMethod;
    let terminalPayment:
      | {
          provider: string;
          externalId: string;
          merchantTxnId: string;
          reference?: string;
        }
      | undefined;

    const shouldAutoTerminal =
      terminalReady &&
      terminalConfig.autoCollect &&
      !splitPayment &&
      (paymentMethod === "CARD" || paymentMethod === "UPI");

    if (shouldAutoTerminal) {
      const outcome = await collectOnTerminal();
      if (!outcome) return;
      resolvedPaymentMethod = outcome.paymentMethod;
      terminalPayment = {
        provider: outcome.collect.provider,
        externalId: outcome.collect.externalId,
        merchantTxnId: outcome.collect.merchantTxnId,
        reference: outcome.reference,
      };
    }

    try {
      await createMutation.mutateAsync({
        clientId: saleClientIdRef.current,
        customerId: selectedCustomerId,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        customerGstin: normalizedGstin || null,
        staffId: selectedStaffId || null,
        salesBoyName: salesBoyName.trim() || null,
        issueInvoice: true,
        ...(discountMode === "percent"
          ? { discountPercent: Number(discountPercent) || 0 }
          : { discountRupees: Number(discountRupees) || 0 }),
        taxRatePercent: Number(taxRatePercent) || 0,
        taxIncluded,
        paymentMethod: resolvedPaymentMethod,
        selectedOfferId: offerSelectionSettled ? selectedOfferId : undefined,
        skipOffer: offerSelectionSettled && selectedOfferId === null,
        ...(paidRupees.trim() ? { paidRupees: Number(paidRupees) } : {}),
        ...(terminalPayment ? { terminalPayment } : {}),
        ...(splitPayment
          ? {
              splitPayments: [
                { method: "CASH", amountRupees: Number(splitCashRupees) || 0 },
                { method: "UPI", amountRupees: Number(splitUpiRupees) || 0 },
              ],
            }
          : {}),
        // Variant attributes go with each line so the stored invoice, receipt
        // and any later return all identify the exact size that was sold.
        items: cart.map((line) => ({
          name: line.name,
          qty: line.qty,
          priceRupees: line.priceRupees,
          ...(line.inventoryItemId ? { inventoryItemId: line.inventoryItemId } : {}),
          ...(line.productId ? { productId: line.productId } : {}),
          ...(line.barcode ? { barcode: line.barcode } : {}),
          ...(line.sku ? { sku: line.sku } : {}),
          ...(line.size ? { size: line.size } : {}),
          ...(line.color ? { color: line.color } : {}),
          ...(line.variantLabel ? { variantLabel: line.variantLabel } : {}),
          ...(line.unit ? { unit: line.unit } : {}),
          ...(line.itemKind ? { itemKind: line.itemKind } : {}),
        })),
      });
    } catch (err) {
      applyError(err, "Failed to save invoice");
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (cart.length > 0) {
          void completeSale(
            { preventDefault: () => {} } as React.FormEvent,
            false
          );
        }
        return;
      }
      if (!typing && e.key === "F2") {
        e.preventDefault();
        scanRef.current?.focus();
      }
      if (!typing && e.key === "F9") {
        e.preventDefault();
        if (cart.length > 0) {
          void completeSale(
            { preventDefault: () => {} } as React.FormEvent,
            true
          );
        }
        return;
      }
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && !splitPayment) {
        if (e.key === "1") setPaymentMethod("CASH");
        if (e.key === "2") setPaymentMethod("UPI");
        if (e.key === "3") setPaymentMethod("CARD");
        if (e.key === "4") setPaymentMethod("BANK");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <>
      {terminalCollecting ? (
        <div className="print-hidden fixed inset-0 z-[110] flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-2xl border bg-card p-6 text-center shadow-xl">
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
            <p className="font-semibold">Waiting for card machine…</p>
            <p className="mt-2 text-sm text-muted-foreground">{terminalHint}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={cancelCollect}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    <div className="min-w-0 max-w-full space-y-3">
      <FormFeedback warning={warning} error={error} />

      <OfferPickerDialog
        open={offerPickerOpen}
        onOpenChange={setOfferPickerOpen}
        offers={applicableOffers}
        pendingOfferId={pendingOfferId}
        onPendingChange={setPendingOfferId}
        onConfirm={confirmOfferPicker}
        wipesBill={
          (applicableOffers.find((o) => o.offerId === pendingOfferId)?.discountRupees ?? 0) >=
          cartSubtotalRupees - 0.005
        }
      />

      {heldBills.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-xl border bg-amber-50/80 p-3 dark:bg-amber-950/20">
          <span className="w-full text-xs font-medium text-amber-900 dark:text-amber-200">
            Hold bills (30 min max)
          </span>
          {heldBills.map((held) => (
            <div
              key={held.id}
              className="flex w-full flex-col gap-2 rounded-lg border bg-background p-3 text-sm sm:flex-row sm:items-center sm:px-3 sm:py-1.5"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium">
                  Hold #{held.holdNumber}
                  {held.customerName ? ` · ${held.customerName}` : ""}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground sm:mt-0 sm:inline sm:ml-2">
                  {formatRemainingMs(held.expiresAt)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-md px-2 text-xs"
                  disabled={resumeHoldMutation.isPending}
                  onClick={() => resumeHeldBill(held.id)}
                >
                  Resume
                </Button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => cancelHeldBill(held.id)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => void completeSale(e, true)}
        className="overflow-hidden rounded-2xl border bg-card shadow-sm"
      >
        <div className="space-y-4 p-4 sm:p-5">
          <FormSection title="Customer">
            <CustomerPicker
              customerName={customerName}
              customerPhone={customerPhone}
              customerGstin={customerGstin}
              selectedCustomerId={selectedCustomerId}
              onCustomerNameChange={setCustomerName}
              onCustomerPhoneChange={setCustomerPhone}
              onCustomerGstinChange={setCustomerGstin}
              onSelectCustomer={(customer: ShopCustomerOption | null) =>
                setSelectedCustomerId(customer?.id ?? null)
              }
            />
            <div className="space-y-1.5">
              <Label className="text-sm">Sales staff</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                {staffEnabled && (staffQuery.data ?? []).length > 0 ? (
                  <select
                    value={selectedStaffId}
                    onChange={(e) => {
                      const staffId = e.target.value;
                      setSelectedStaffId(staffId);
                      const staff = (staffQuery.data ?? []).find(
                        (s) => s.id === staffId
                      );
                      setSalesBoyName(staff?.name ?? "");
                    }}
                    className="h-10 w-full shrink-0 rounded-lg border bg-background px-2 text-sm sm:w-[170px]"
                  >
                    <option value="">Staff…</option>
                    {(staffQuery.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.roleTitle}
                      </option>
                    ))}
                  </select>
                ) : null}
                <Input
                  value={salesBoyName}
                  onChange={(e) => {
                    setSalesBoyName(e.target.value);
                    setSelectedStaffId("");
                  }}
                  className="h-10 rounded-lg"
                  placeholder="Name (optional)"
                />
              </div>
              {staffEnabled ? (
                <p className="text-xs text-muted-foreground">
                  {usesServiceCatalog
                    ? "One staff member per bill — used for service commission (not per line item)."
                    : "Pick from the list to link this bill to their sales commission."}
                </p>
              ) : null}
            </div>
          </FormSection>

          <FormSection title={catalogSectionLabel} className="border-t pt-4">
            {!inventoryEnabled ? (
              <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{inventoryModuleLabel}</span> is turned
                off for this organization. Enable it under{" "}
                <Link
                  href="/settings/organization"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Settings → Organization → Features
                </Link>{" "}
                to pick products from your catalog, or keep adding items manually below.
              </p>
            ) : null}

            {inventoryEnabled && inventoryLoadError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
                Could not load {inventoryModuleLabel.toLowerCase()}: {inventoryLoadError}. Check your
                branch selection in the header, or try switching organization.
              </p>
            ) : null}

            {inventoryEnabled && (
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={scanRef}
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleBarcodeScan(scanInput);
                      }
                    }}
                    className="h-11 rounded-lg pl-9 font-mono text-sm"
                    placeholder="Scan barcode"
                    autoComplete="off"
                  />
                </div>
                <CameraScanButton
                  onCode={(code) => {
                    if (code) void handleBarcodeScan(code);
                  }}
                />
              </div>
            )}

            {inventoryEnabled && showCatalogTabs && (categoriesQuery.data?.categories ?? []).length > 0 ? (
              <InvoiceCatalogPicker
                businessTypes={shopBusinessTypes}
                categories={categoriesQuery.data?.categories ?? []}
                categoryKey={catalogCategoryKey}
                subCategoryKey={catalogSubCategoryKey}
                onCategoryChange={(key) => {
                  setCatalogCategoryKey(key);
                  setCatalogSubCategoryKey("");
                }}
                onSubCategoryChange={setCatalogSubCategoryKey}
              />
            ) : null}

            {showInventoryPicker ? (
              <div className="space-y-2">
                <Label className="text-sm">Select from inventory</Label>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {useInventorySearchPicker
                      ? inventorySearchMode
                        ? `Search ${inventoryTotalCount.toLocaleString()} products by name, size, SKU or barcode`
                        : "Search by name, size, SKU or barcode"
                      : "Pick a product — every size is listed separately"}
                  </p>
                  {!inventorySearchMode && pickableInventory.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowStockSearch((v) => !v)}
                      className="shrink-0 text-xs font-medium text-primary hover:underline"
                    >
                      {showStockSearch ? "Use dropdown" : "Search stock"}
                    </button>
                  ) : null}
                </div>
                {useInventorySearchPicker ? (
                  <VariantSearchPicker
                    options={pickableInventory}
                    searchMode={inventorySearchMode}
                    onServerSearch={inventorySearchMode ? searchInventoryOnServer : undefined}
                    onSelect={(option) => {
                      const item =
                        pickableInventory.find((i) => i.id === option.id) ??
                        serverInventoryCache.current.get(option.id);
                      if (item) addInventoryToCart(item, Number(qty) || 1);
                    }}
                    emptyLabel={
                      inventorySearchMode
                        ? "Type to search your inventory"
                        : "No product matches that search"
                    }
                  />
                ) : (
                  <VariantSelect
                    options={pickableInventory}
                    value={selectedInventoryId}
                    onChange={pickInventoryItem}
                    placeholder="Pick from stock…"
                  />
                )}
              </div>
            ) : null}

            {inventoryEnabled &&
            !inventoryQuery.isLoading &&
            !inventoryLoadError &&
            !showInventoryPicker &&
            inventoryTotalCount === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
                No {inventoryModuleLabel.toLowerCase()} items yet for this branch.{" "}
                <Link
                  href={inventoryCatalogHref}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Add products in {inventoryModuleLabel}
                </Link>{" "}
                first, or enter items manually below.
              </p>
            ) : null}

            {inventoryEnabled &&
            !inventorySearchMode &&
            pickableInventory.length === 0 &&
            (inventoryQuery.data?.items ?? []).length > 0 ? (
              <p className="text-xs text-muted-foreground">
                No items in this category — pick another tab or add from manual entry below.
              </p>
            ) : null}

            <div className="grid grid-cols-12 gap-2">
              <Input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="col-span-12 h-10 rounded-lg sm:col-span-5"
                placeholder="Item name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLineToCart();
                  }
                }}
              />
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="col-span-4 h-10 rounded-lg sm:col-span-2"
                placeholder="Qty"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="col-span-5 h-10 rounded-lg sm:col-span-3"
                placeholder="Rate"
              />
              <Button
                type="button"
                className="col-span-3 h-10 rounded-lg sm:col-span-2"
                onClick={addLineToCart}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>

            {cart.length === 0 ? (
              <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                No items yet — add above or scan a barcode
              </p>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-xl text-base sm:hidden"
                  onClick={() => setCartSheetOpen(true)}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Cart · {cart.length} · ₹{cartTotal.toFixed(2)}
                </Button>
                <div className="hidden max-h-[min(360px,42vh)] overflow-y-auto sm:block">
                  <InvoiceCartTable
                    cart={cart}
                    cartLineAllocations={cartLineAllocations}
                    invoiceTemplate={invoiceTemplate}
                    showLineStaff={false}
                    staffOptions={[]}
                    onQtyDelta={updateCartLineQty}
                    onRemove={(lineId) =>
                      setCart((prev) => prev.filter((l) => l.id !== lineId))
                    }
                    onStaffChange={() => {}}
                  />
                </div>
                <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
                  <SheetContent>
                    <SheetTitle>Cart</SheetTitle>
                    <ul className="mt-3 space-y-2">
                      {cart.map((line) => (
                        <li
                          key={line.id}
                          className="flex items-start justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">{line.name}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {line.qty} × ₹{line.priceRupees.toFixed(2)}
                            </p>
                          </div>
                          <DeleteIconButton
                            variant="ghost"
                            onClick={() =>
                              setCart((prev) => prev.filter((l) => l.id !== line.id))
                            }
                            aria-label={`Remove ${line.name}`}
                          />
                        </li>
                      ))}
                    </ul>
                  </SheetContent>
                </Sheet>
              </>
            )}
          </FormSection>

          <FormSection title="Offer" className="border-t pt-4">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add items to see the offers that apply.
              </p>
            ) : offerPreviewQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Checking offers…</p>
            ) : offerPreviewQuery.isError ? (
              <p className="text-sm text-destructive">
                Could not load offers — the bill will still be checked when you save.
              </p>
            ) : applicableOffers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No offer applies to these items.
              </p>
            ) : (
              <div className="space-y-2">
                <select
                  value={offerSelectionSettled ? (selectedOfferId ?? "") : ""}
                  onChange={(e) => applyOfferChoice(e.target.value || null)}
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                >
                  <option value="">No offer</option>
                  {applicableOffers.map((offer) => (
                    <option key={offer.offerId} value={offer.offerId}>
                      {offer.name} — − ₹{offer.discountRupees.toFixed(2)}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    Only one offer per bill. Change anytime before saving.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={openOfferPicker}
                  >
                    {applicableOffers.length > 1 ? "Compare offers" : "Review offer"}
                  </Button>
                </div>
              </div>
            )}
          </FormSection>

          <FormSection title="Discount & tax" className="border-t pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Store discount</Label>
                  <div className="inline-flex rounded-md border p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDiscountMode("rupees")}
                      className={cn(
                        "rounded px-2 py-0.5 font-medium",
                        discountMode === "rupees"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      ₹
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountMode("percent")}
                      className={cn(
                        "rounded px-2 py-0.5 font-medium",
                        discountMode === "percent"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      %
                    </button>
                  </div>
                </div>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  max={discountMode === "percent" ? 100 : undefined}
                  value={discountMode === "percent" ? discountPercent : discountRupees}
                  onChange={(e) =>
                    discountMode === "percent"
                      ? setDiscountPercent(e.target.value)
                      : setDiscountRupees(e.target.value)
                  }
                  className="h-10 rounded-lg"
                  placeholder="0"
                />
                <p className="text-[11px] text-muted-foreground">
                  {invoiceTemplate.discountBasis === "total"
                    ? "Applied on total incl. tax (Invoice settings)"
                    : "Applied on subtotal before tax (Invoice settings)"}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Tax rate %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(e.target.value)}
                  className="h-10 rounded-lg"
                  placeholder="0"
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={taxIncluded} onCheckedChange={setTaxIncluded} />
                  Tax included in rates
                </label>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Total is auto rounded down to the nearest whole rupee (paisa never added).
            </p>
          </FormSection>
        </div>

        <div className="space-y-4 border-t bg-muted/25 px-4 py-4 sm:px-5">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">₹{pricing.subtotalRupees.toFixed(2)}</span>
            </div>
            {applicableOffers.length > 0 ? (
              <div className="space-y-1.5 rounded-lg border border-emerald-300/50 bg-emerald-50/40 px-2.5 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" />
                    Offer
                  </span>
                  {appliedOfferName ? (
                    <button
                      type="button"
                      onClick={removeOffer}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <select
                  value={offerSelectionSettled ? (selectedOfferId ?? "") : ""}
                  onChange={(e) => applyOfferChoice(e.target.value || null)}
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">No offer</option>
                  {applicableOffers.map((offer) => (
                    <option key={offer.offerId} value={offer.offerId}>
                      {offer.name} (− ₹{offer.discountRupees.toFixed(2)})
                    </option>
                  ))}
                </select>
                {offerWouldWipeBill ? (
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    This offer covers the full bill (total ₹0). Remove or change it to complete the
                    sale.
                  </p>
                ) : null}
              </div>
            ) : null}
            {pricing.discountBasis !== "total" && pricing.discountRupees > 0 ? (
              <>
                {(() => {
                  const manualPart =
                    discountMode === "percent"
                      ? Math.round(
                          ((pricing.subtotalRupees * (Number(discountPercent) || 0)) / 100) * 100
                        ) / 100
                      : Number(discountRupees) || 0;
                  const offerPart = offerDiscountRupees;
                  if (manualPart > 0 && offerPart > 0) {
                    return (
                      <>
                        <div className="flex justify-between text-emerald-700">
                          <span>Store discount</span>
                          <span className="tabular-nums">− ₹{manualPart.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700">
                          <span>Offer discount</span>
                          <span className="tabular-nums">− ₹{offerPart.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  }
                  if (offerPart > 0) {
                    return (
                      <div className="flex justify-between text-emerald-700">
                        <span>Offer discount</span>
                        <span className="tabular-nums">− ₹{offerPart.toFixed(2)}</span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex justify-between text-emerald-700">
                      <span>
                        Store discount
                        {discountMode === "percent" && Number(discountPercent) > 0
                          ? ` (${discountPercent}%)`
                          : ""}
                      </span>
                      <span className="tabular-nums">− ₹{pricing.discountRupees.toFixed(2)}</span>
                    </div>
                  );
                })()}
              </>
            ) : null}
            {offerPreviewQuery.isError ? (
              <p className="text-xs text-destructive">
                Could not load offers — discount may still apply when you save.
              </p>
            ) : null}
            {pricing.gstRupees > 0 ? (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxable</span>
                  <span className="tabular-nums">₹{pricing.taxableRupees.toFixed(2)}</span>
                </div>
                {pricing.taxRatePercent > 0 ? (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>CGST ({(pricing.taxRatePercent / 2).toFixed(1)}%)</span>
                      <span className="tabular-nums">₹{pricing.cgstRupees.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>SGST ({(pricing.taxRatePercent / 2).toFixed(1)}%)</span>
                      <span className="tabular-nums">₹{pricing.sgstRupees.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST</span>
                    <span className="tabular-nums">₹{pricing.gstRupees.toFixed(2)}</span>
                  </div>
                )}
              </>
            ) : null}
            {pricing.discountBasis === "total" && pricing.discountRupees > 0 ? (
              <div className="flex justify-between text-emerald-700">
                <span>
                  Discount
                  {discountMode === "percent" && Number(discountPercent) > 0
                    ? ` (${discountPercent}%)`
                    : ""}
                </span>
                <span className="tabular-nums">− ₹{pricing.discountRupees.toFixed(2)}</span>
              </div>
            ) : null}
            {invoiceTemplate.useDecimalPlaces && pricing.roundOffRupees < -0.004 ? (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Round off</span>
                <span className="tabular-nums">
                  − {formatInvoiceMoney(Math.abs(pricing.roundOffRupees), invoiceTemplate)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">₹{cartTotal.toFixed(2)}</span>
            </div>
          </div>

          <div
            className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${udhaarEnabled ? "lg:grid-cols-4" : ""}`}
          >
            {PAYMENT_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setPaymentMethod(value);
                  if (value !== "CASH") setCashReceivedRupees("");
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition-colors",
                  paymentMethod === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
            {udhaarEnabled && (
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod("CREDIT");
                  setCashReceivedRupees("");
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition-colors",
                  paymentMethod === "CREDIT"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                <Receipt className="h-4 w-4" />
                Udhaar
              </button>
            )}
          </div>
          {!udhaarEnabled ? (
            <p className="text-xs text-muted-foreground">
              Need udhaar or partial payments?{" "}
              <Link href="/settings/organization" className="font-medium text-primary underline-offset-2 hover:underline">
                Enable Customer credit ledger
              </Link>{" "}
              under Features.
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={splitPayment}
              onChange={(e) => {
                setSplitPayment(e.target.checked);
                if (e.target.checked) {
                  setSplitCashRupees(String((cartTotal / 2).toFixed(2)));
                  setSplitUpiRupees(String((cartTotal / 2).toFixed(2)));
                }
              }}
              className="rounded border-border"
            />
            Split payment (cash + UPI)
          </label>
          {splitPayment ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Cash ₹</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={splitCashRupees}
                  onChange={(e) => setSplitCashRupees(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">UPI ₹</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={splitUpiRupees}
                  onChange={(e) => setSplitUpiRupees(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                Total must equal ₹{cartTotal.toFixed(2)} · F2 scan · F9 complete · 1–4 payment · Ctrl+S save
              </p>
            </div>
          ) : null}
          {paymentMethod === "CASH" && !splitPayment ? (
            <CashTenderPanel
              totalRupees={cartTotal}
              receivedRupees={cashReceivedRupees}
              onReceivedChange={setCashReceivedRupees}
            />
          ) : null}
          {terminalReady &&
          !splitPayment &&
          (paymentMethod === "CARD" || paymentMethod === "UPI") &&
          !terminalConfig.autoCollect ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl"
              disabled={terminalCollecting || cart.length === 0}
              onClick={() => void collectOnTerminal()}
            >
              {terminalCollecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Collect ₹{cartTotal.toFixed(2)} on machine
            </Button>
          ) : null}
          {udhaarEnabled && paymentMethod !== "CREDIT" && paymentMethod !== "CASH" && !splitPayment && (
            <div className="space-y-1.5">
              <Label className="text-sm">Paid now (₹) — leave blank for full payment</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={paidRupees}
                onChange={(e) => setPaidRupees(e.target.value)}
                placeholder={String(cartTotal.toFixed(2))}
                className="h-10 rounded-lg"
              />
            </div>
          )}
        </div>

        <div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 grid grid-cols-1 gap-2 border-t bg-card p-4 sm:static sm:grid-cols-3 sm:p-5">
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-xl sm:h-11 sm:flex-1"
            onClick={holdCurrentBill}
            disabled={cart.length === 0}
          >
            <PauseCircle className="mr-2 h-4 w-4" />
            Hold
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-xl sm:h-11 sm:flex-1"
            onClick={(e) => void completeSale(e, false)}
            disabled={createMutation.isPending || terminalCollecting || cart.length === 0}
          >
            Save only
          </Button>
          <Button
            type="submit"
            className="h-12 w-full rounded-xl text-base sm:h-11 sm:flex-[2]"
            disabled={createMutation.isPending || terminalCollecting || cart.length === 0}
          >
            <Printer className="mr-2 h-4 w-4 shrink-0" />
            {createMutation.isPending ? (
              "Saving…"
            ) : (
              <>
                <span className="sm:hidden">Complete bill · ₹{cartTotal.toFixed(2)}</span>
                <span className="hidden sm:inline">
                  {`Save & print · ₹${cartTotal.toFixed(2)}`}
                </span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
    <KotPrintLayer />
    </>
  );
}
