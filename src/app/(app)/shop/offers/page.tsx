"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Gift, Plus, Tag } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR } from "@/lib/finance/money";
import { canManageOrg } from "@/lib/permissions/rbac";
import { parseInventoryCategory } from "@/lib/shop/inventory-categories";
import { describeOfferRule } from "@/lib/shop/offer-engine";
import type { OrgRole } from "@prisma/client";

type OfferRow = {
  id: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  buyQuantity: number | null;
  getQuantity: number | null;
  minPurchasePaise: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageCount: number;
  totalDiscountPaise: string;
};

type InventoryOption = {
  id: string;
  name: string;
  sellPaise: string | null;
  sectorMeta?: unknown;
};

const DISCOUNT_TYPE_OPTIONS = [
  {
    value: "PERCENT",
    label: "Whole cart — % off",
    hint: "Value = percentage (10 means 10% off the entire bill)",
  },
  {
    value: "FIXED_AMOUNT",
    label: "Whole cart — flat ₹ off",
    hint: "Value = rupees off the entire bill",
  },
  {
    value: "CART_MIN_FLAT",
    label: "Spend minimum — flat ₹ off",
    hint: "Set minimum purchase below; value = rupees off when cart qualifies",
  },
  {
    value: "PRODUCT_PERCENT",
    label: "Specific products — % off",
    hint: "Select products below; value = percentage off those lines",
  },
  {
    value: "PRODUCT_FIXED",
    label: "Specific products — flat ₹ off",
    hint: "Select products below; value = rupees off per matching line",
  },
  {
    value: "CATEGORY_PERCENT",
    label: "Category — % off",
    hint: "Select category; value = percentage off matching items",
  },
  {
    value: "CATEGORY_FIXED",
    label: "Category — flat ₹ off",
    hint: "Select category; value = rupees off matching lines",
  },
  {
    value: "BUY_X_GET_Y",
    label: "Buy X Get Y free (any selected product)",
    hint: "Bill must contain buy qty + free qty items; the cheapest ones become free",
  },
  {
    value: "BUY_X_GET_X",
    label: "Buy X Get X free (same item)",
    hint: "Same item only — bill must contain buy qty + free qty of it",
  },
] as const;

export default function ShopOffersPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const role = useAuthStore((s) => s.role);
  const canManage = canManageOrg(role as OrgRole);
  const qc = useQueryClient();
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();

  const [filter, setFilter] = useState<"active" | "upcoming" | "expired" | "all">("active");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] =
    useState<(typeof DISCOUNT_TYPE_OPTIONS)[number]["value"]>("PERCENT");
  const [discountValue, setDiscountValue] = useState("10");
  const [minPurchaseRupees, setMinPurchaseRupees] = useState("");
  const [buyQuantity, setBuyQuantity] = useState("2");
  const [getQuantity, setGetQuantity] = useState("1");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: orgId ? [...queryKeys.modules.shop.offers(orgId), filter] : ["disabled"],
    queryFn: () => apiFetch<OfferRow[]>(`/api/v1/shop/offers?filter=${filter}`),
    enabled: !!orgId,
  });

  const inventoryQuery = useQuery({
    queryKey: orgId ? queryKeys.modules.shop.inventory(orgId) : ["disabled"],
    queryFn: () => apiFetch<InventoryOption[]>("/api/v1/shop/inventory"),
    enabled: !!orgId && canManage,
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of inventoryQuery.data ?? []) {
      const cat = parseInventoryCategory(item.sectorMeta);
      if (cat) set.add(cat);
    }
    return [...set].sort();
  }, [inventoryQuery.data]);

  const selectedTypeMeta = DISCOUNT_TYPE_OPTIONS.find((o) => o.value === discountType);
  const needsProducts =
    discountType.startsWith("PRODUCT") ||
    discountType === "BUY_X_GET_Y" ||
    discountType === "BUY_X_GET_X";
  const needsCategory = discountType.startsWith("CATEGORY");
  const needsMinPurchase = discountType === "CART_MIN_FLAT";
  const needsBogoQty =
    discountType === "BUY_X_GET_Y" || discountType === "BUY_X_GET_X";
  const isPercentType = discountType.includes("PERCENT");

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch("/api/v1/shop/offers", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.offers(orgId) });
        qc.invalidateQueries({ queryKey: queryKeys.modules.shop.dashboard(orgId) });
      }
      setFilter("all");
      setName("");
      setDescription("");
      clear();
      showWarning("Offer saved — cashiers can apply it on the next bill.");
    },
    onError: (err) => applyError(err, "Failed to create offer"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/api/v1/shop/offers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      if (orgId) qc.invalidateQueries({ queryKey: queryKeys.modules.shop.offers(orgId) });
    },
  });

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleCreate() {
    clear();
    if (!name.trim()) return showWarning("Enter an offer name");
    if (needsProducts && selectedProductIds.length === 0) {
      return showWarning("Select at least one product for this offer");
    }
    if (needsCategory && !selectedCategory) {
      return showWarning("Select a category for this offer");
    }
    if (needsMinPurchase && !(Number(minPurchaseRupees) > 0)) {
      return showWarning("Enter minimum purchase amount in rupees");
    }
    if (!needsBogoQty && !(Number(discountValue) > 0)) {
      return showWarning("Enter a discount value greater than zero");
    }
    if (isPercentType && Number(discountValue) > 100) {
      return showWarning("Percentage discount cannot be more than 100%");
    }
    if (needsBogoQty && !(Number(buyQuantity) > 0 && Number(getQuantity) > 0)) {
      return showWarning("Buy quantity and free quantity must both be at least 1");
    }

    await createMutation.mutateAsync({
      name: name.trim(),
      description: description.trim() || null,
      discountType,
      discountValue: needsBogoQty ? 0 : Number(discountValue),
      productIds: needsProducts ? selectedProductIds : undefined,
      categoryKeys: needsCategory ? [selectedCategory] : undefined,
      minPurchaseRupees: needsMinPurchase ? Number(minPurchaseRupees) : undefined,
      buyQuantity: needsBogoQty ? Number(buyQuantity) : undefined,
      getQuantity: needsBogoQty ? Number(getQuantity) : undefined,
      startDate: new Date(`${startDate}T00:00:00`).toISOString(),
      endDate: new Date(`${endDate}T23:59:59.999`).toISOString(),
      isActive: true,
    });
  }

  if (isLoading) return <PageLoader label="Loading offers..." />;
  if (loadError) {
    return (
      <p className="p-8 text-destructive">
        {loadError instanceof Error ? loadError.message : "Failed to load offers"}
      </p>
    );
  }

  const offers = data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Tag className="h-6 w-6 text-primary" />
            Offers & discounts
          </h1>
          <p className="text-sm text-muted-foreground">
            Active offers appear on the bill — cashier picks one (never stacked).
          </p>
        </div>
      </div>

      {canManage ? (
        <Card className="rounded-2xl border-primary/20 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              Create new offer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormFeedback warning={warning} error={error} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Offer name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Diwali 10% off"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description (optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Shown internally for your reference"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Discount type</Label>
                <select
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(
                      e.target.value as (typeof DISCOUNT_TYPE_OPTIONS)[number]["value"]
                    )
                  }
                  className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
                >
                  {DISCOUNT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {selectedTypeMeta ? (
                  <p className="text-xs text-muted-foreground">{selectedTypeMeta.hint}</p>
                ) : null}
              </div>
              {needsBogoQty ? null : (
                <div className="space-y-1.5">
                  <Label>{isPercentType ? "Percentage (%)" : "Amount (₹)"}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={isPercentType ? 100 : undefined}
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              )}
              {needsMinPurchase ? (
                <div className="space-y-1.5">
                  <Label>Minimum purchase (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={minPurchaseRupees}
                    onChange={(e) => setMinPurchaseRupees(e.target.value)}
                    placeholder="e.g. 2000"
                    className="rounded-xl"
                  />
                </div>
              ) : null}
              {needsBogoQty ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Buy quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={buyQuantity}
                      onChange={(e) => setBuyQuantity(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Free quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={getQuantity}
                      onChange={(e) => setGetQuantity(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </>
              ) : null}
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>End date</Label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  className="rounded-xl"
                />
              </div>
            </div>

            {needsCategory ? (
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {needsProducts ? (
              <div className="space-y-2">
                <Label>Products</Label>
                <div className="max-h-48 overflow-y-auto rounded-xl border p-2">
                  {(inventoryQuery.data ?? []).length === 0 ? (
                    <p className="p-2 text-sm text-muted-foreground">
                      No inventory items — add products first.
                    </p>
                  ) : (
                    (inventoryQuery.data ?? []).map((item) => (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(item.id)}
                          onChange={() => toggleProduct(item.id)}
                          className="rounded"
                        />
                        <span className="flex-1">{item.name}</span>
                        {item.sellPaise ? (
                          <span className="text-xs text-muted-foreground">
                            {formatINR(item.sellPaise)}
                          </span>
                        ) : null}
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-dashed bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Customer sees: </span>
              {describeOfferRule({
                discountType,
                discountValue: needsBogoQty ? 0 : Number(discountValue) || 0,
                buyQuantity: needsBogoQty ? Number(buyQuantity) || 0 : null,
                getQuantity: needsBogoQty ? Number(getQuantity) || 0 : null,
                minPurchasePaise: needsMinPurchase
                  ? String(Math.round((Number(minPurchaseRupees) || 0) * 100))
                  : null,
              })}
            </div>

            <Button
              className="w-full rounded-xl sm:w-auto"
              disabled={createMutation.isPending}
              onClick={handleCreate}
            >
              {createMutation.isPending ? "Saving…" : "Save offer"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-6 text-sm text-muted-foreground">
            Only the shop owner can create offers. Active offers still show on the bill so
            cashiers can pick one.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Your offers</h2>
          <div className="flex flex-wrap gap-2">
            {(["active", "upcoming", "expired", "all"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                className="rounded-xl capitalize"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        {offers.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Gift className="h-10 w-10 text-muted-foreground/60" />
              <div>
                <p className="font-medium">No {filter} offers</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {canManage
                    ? "Use the form above to create your first promotional offer."
                    : "Ask the owner to create offers for this shop."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          offers.map((offer) => (
            <Card key={offer.id} className="rounded-2xl">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{offer.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        offer.isActive
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {offer.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {offer.description ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{offer.description}</p>
                  ) : null}
                  <p className="mt-1 text-sm">{describeOfferRule(offer)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(offer.startDate).toLocaleDateString("en-IN")} –{" "}
                    {new Date(offer.endDate).toLocaleDateString("en-IN")} · Used{" "}
                    {offer.usageCount}× · Total saved {formatINR(offer.totalDiscountPaise)}
                  </p>
                </div>
                {canManage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-xl"
                    disabled={toggleMutation.isPending}
                    onClick={() =>
                      toggleMutation.mutate({ id: offer.id, isActive: !offer.isActive })
                    }
                  >
                    {offer.isActive ? "Deactivate" : "Activate"}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
