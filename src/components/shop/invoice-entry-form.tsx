"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR, paiseToRupees } from "@/lib/finance/money";
import { formatStockLabel, isInfiniteStock } from "@/lib/shop/inventory";
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
import {
  computeInvoicePricing,
  formatInvoiceMoney,
  formatLineDiscountHint,
  resolveInvoiceLineAllocations,
  shouldShowLineDiscountHints,
} from "@/lib/shop/invoice-pricing";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CameraScanButton } from "@/components/shop/camera-scan-button";
import { Banknote, CreditCard, PauseCircle, Plus, Printer, Receipt, ScanLine, ShoppingBag, Smartphone, Tag } from "lucide-react";
import Link from "next/link";
import { OfferPickerDialog } from "@/components/shop/offer-picker-dialog";
import {
  CashTenderPanel,
  buildCashTender,
} from "@/components/shop/cash-tender-panel";
import type { CashTender } from "@/lib/shop/invoice-receipt-print";
import { useKeepAwake } from "@/hooks/use-keep-awake";
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
import { variantSubtitle } from "@/lib/shop/variant-display";

/** Size/colour qualifier for a cart row, empty for products without variants. */
function saleLineVariantSubtitle(line: SaleLine): string {
  return variantSubtitle(line);
}

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
  customerName: string | null;
  customerPhone: string | null;
  customerGstin: string | null;
  salesBoyName: string | null;
  notes: string | null;
  totalPaise: string;
  gstPaise?: string;
  paymentMethod: string;
  createdAt: string;
  itemsJson: { name: string; qty: number; priceRupees: number }[];
  pricingJson?: unknown;
  organization: { name: string };
  createdBy: { name: string };
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
  product?: { id: string; name: string; brand: string | null } | null;
};

type StaffOption = { id: string; name: string; roleTitle: string };

type InvoiceEntryFormProps = {
  onDraftChange: (draft: ShopInvoiceData) => void;
  onSaved: (
    sale: ShopSaleResult,
    invoice: ShopInvoiceData,
    cashTender?: CashTender | null
  ) => void;
  resetKey?: number;
};

export function InvoiceEntryForm({
  onDraftChange,
  onSaved,
  resetKey = 0,
}: InvoiceEntryFormProps) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const orgName = useAuthStore((s) => s.activeOrganizationName);
  const userName = useAuthStore((s) => s.user?.name);
  const { enabledModules } = useAuthStore();
  const inventoryEnabled = isModuleEnabled(enabledModules, "shop_inventory");
  const udhaarEnabled = isModuleEnabled(enabledModules, "shop_udhaar");
  const staffEnabled = isModuleEnabled(enabledModules, "staff");
  const invoiceTemplate = useShopInvoiceTemplate();
  useKeepAwake(true);

  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const qc = useQueryClient();
  const scanRef = useRef<HTMLInputElement>(null);
  const restoreOfferRef = useRef<{
    selectedOfferId: string | null;
    settled: boolean;
  } | null>(null);
  const promptedCartKeyRef = useRef<string | null>(null);
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

  const cartOfferKey = useMemo(
    () =>
      cart
        .map((l) => `${l.inventoryItemId ?? l.name}:${l.qty}:${l.priceRupees}`)
        .join("|"),
    [cart]
  );

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
    queryKey: orgId ? queryKeys.modules.shop.inventory(orgId) : ["disabled"],
    queryFn: () => apiFetch<InventoryItem[]>("/api/v1/shop/inventory"),
    enabled: !!orgId && inventoryEnabled,
  });

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
    refetchInterval: 15000,
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
          cartOfferKey,
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
  const appliedOfferName = offerPreviewQuery.data?.offerDetails[0]?.name ?? null;
  const offerWouldWipeBill =
    offerDiscountRupees > 0 && offerDiscountRupees >= cartSubtotalRupees - 0.005;

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<ShopSaleResult>("/api/v1/shop/sales", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (sale) => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.invoices(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.sales(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.dashboard(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.inventory(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.customerRegistry(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread(orgId) });
      }
      const invoice: ShopInvoiceData = {
        orgName: sale.organization.name,
        billNumber: sale.billNumber,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        customerGstin: sale.customerGstin,
        salesBoyName: sale.salesBoyName,
        paymentMethod: sale.paymentMethod,
        notes: sale.notes,
        items: sale.itemsJson ?? [],
        totalPaise: sale.totalPaise,
        gstPaise: sale.gstPaise,
        pricing: parsePricingJson(sale.pricingJson),
        createdAt: sale.createdAt,
        cashierName: sale.createdBy?.name ?? null,
      };
      onSaved(sale, invoice, paymentMethod === "CASH" ? buildCashTender(cartTotal, cashReceivedRupees) : null);
    },
  });

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
    const inv = (inventoryQuery.data ?? []).find((i) => i.id === inventoryItemId);
    if (!inv || isInfiniteStock(inv.quantity)) return true;
    const inCart = cartSource
      .filter((line) => line.inventoryItemId === inventoryItemId)
      .reduce((sum, line) => sum + line.qty, 0);
    const remaining = inv.quantity - inCart;
    if (addQty > remaining) {
      showWarning(
        remaining <= 0
          ? `No stock left for ${nameForError}`
          : `Only ${remaining} ${inv.unit} left for ${nameForError}`
      );
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
    const item = (inventoryQuery.data ?? []).find((i) => i.id === itemId);
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
      ? (inventoryQuery.data ?? []).find((i) => i.id === selectedInventoryId)
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
    clear();
    try {
      await holdBillMutation.mutateAsync({
        customerId: selectedCustomerId,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        customerGstin: customerGstin.trim() || null,
        salesBoyName: salesBoyName.trim() || null,
        cartJson: cart,
        pricingJson: {
          discountMode,
          discountRupees,
          discountPercent,
          taxRatePercent,
          taxIncluded,
          selectedOfferId,
          offerSelectionSettled,
        },
      });
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

  async function completeSale(e: React.FormEvent) {
    e.preventDefault();
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
    if (paymentMethod === "CASH") {
      const received = Number(cashReceivedRupees) || 0;
      if (received < cartTotal - 0.005) {
        return showWarning(`Enter cash received — at least ₹${cartTotal.toFixed(2)}`);
      }
    }
    try {
      await createMutation.mutateAsync({
        customerId: selectedCustomerId,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        customerGstin: customerGstin.trim() || null,
        staffId: selectedStaffId || null,
        salesBoyName: salesBoyName.trim() || null,
        issueInvoice: true,
        ...(discountMode === "percent"
          ? { discountPercent: Number(discountPercent) || 0 }
          : { discountRupees: Number(discountRupees) || 0 }),
        taxRatePercent: Number(taxRatePercent) || 0,
        taxIncluded,
        paymentMethod,
        selectedOfferId: offerSelectionSettled ? selectedOfferId : undefined,
        skipOffer: offerSelectionSettled && selectedOfferId === null,
        ...(paidRupees.trim() ? { paidRupees: Number(paidRupees) } : {}),
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
        })),
      });
    } catch (err) {
      applyError(err, "Failed to save invoice");
    }
  }

  return (
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
        onSubmit={completeSale}
        className="overflow-hidden rounded-2xl border bg-card shadow-sm"
      >
        <div className="space-y-5 p-4 sm:p-5">
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
                  Picking from the list links this bill to their sales commission.
                </p>
              ) : null}
            </div>
          </FormSection>

          <FormSection title="Items" className="border-t pt-5">
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

            {inventoryEnabled && (inventoryQuery.data ?? []).length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {showStockSearch
                      ? "Search by name, size, SKU or barcode"
                      : "Every size is listed separately"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowStockSearch((v) => !v)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {showStockSearch ? "Use dropdown" : "Search stock"}
                  </button>
                </div>
                {showStockSearch ? (
                  <VariantSearchPicker
                    options={inventoryQuery.data ?? []}
                    onSelect={(option) => {
                      const item = (inventoryQuery.data ?? []).find(
                        (i) => i.id === option.id
                      );
                      if (item) addInventoryToCart(item, Number(qty) || 1);
                    }}
                    emptyLabel="No product matches that search"
                  />
                ) : (
                  <VariantSelect
                    options={inventoryQuery.data ?? []}
                    value={selectedInventoryId}
                    onChange={pickInventoryItem}
                  />
                )}
              </div>
            )}

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
              <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
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
                <div className="hidden overflow-x-auto rounded-lg border sm:block">
                  <table className="w-full min-w-[280px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 font-medium">Qty</th>
                      <th className="px-3 py-2 font-medium">Rate</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((line, idx) => {
                      const allocated = cartLineAllocations?.[idx];
                      const hasLineDiscount =
                        allocated != null && allocated.lineDiscountRupees > 0.004;
                      const unitRate = line.priceRupees;
                      const amount = hasLineDiscount
                        ? allocated.discountedLineRupees
                        : lineTotal(line);
                      const hint = hasLineDiscount
                        ? formatLineDiscountHint(allocated, invoiceTemplate)
                        : null;
                      const fmt = (n: number) => formatInvoiceMoney(n, invoiceTemplate);
                      return (
                      <tr key={line.id} className="border-b last:border-0">
                        <td className="max-w-[8rem] px-3 py-2 break-words sm:max-w-none">
                          <span className="block">{line.name}</span>
                          {saleLineVariantSubtitle(line) ? (
                            <span className="mt-0.5 block text-xs font-medium text-primary">
                              {saleLineVariantSubtitle(line)}
                            </span>
                          ) : null}
                          {hint ? (
                            <span className="mt-0.5 block text-xs text-emerald-700">{hint}</span>
                          ) : null}
                          {line.barcode ? (
                            <code className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                              {line.barcode}
                            </code>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{line.qty}</td>
                        <td className="px-3 py-2 tabular-nums">{fmt(unitRate)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(amount)}</td>
                        <td className="px-2 py-2">
                          <DeleteIconButton
                            variant="ghost"
                            onClick={() =>
                              setCart((prev) => prev.filter((l) => l.id !== line.id))
                            }
                            aria-label={`Remove ${line.name}`}
                          />
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                  </table>
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

          <FormSection title="Offer" className="border-t pt-5">
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

          <FormSection title="Discount & tax" className="border-t pt-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Discount</Label>
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
                          <span>Manual discount</span>
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
                        Discount
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
          {paymentMethod === "CASH" ? (
            <CashTenderPanel
              totalRupees={cartTotal}
              receivedRupees={cashReceivedRupees}
              onReceivedChange={setCashReceivedRupees}
            />
          ) : null}
          {udhaarEnabled && paymentMethod !== "CREDIT" && paymentMethod !== "CASH" && (
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

        <div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 flex flex-col gap-2 border-t bg-card p-4 sm:static sm:flex-row sm:p-5">
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
            type="submit"
            className="h-12 w-full rounded-xl text-base sm:h-11 sm:flex-[2]"
            disabled={createMutation.isPending || cart.length === 0}
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
  );
}
