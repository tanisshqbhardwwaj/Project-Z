"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Plus, Wrench } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { moduleLabel } from "@/lib/org/modules";
import { resolveShopBusinessTypes } from "@/lib/org/shop-settings";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { catalogCategoryLabel, catalogSubCategoryLabel } from "@/lib/shop/category-catalog";
import { getShopSectorConfig, inventoryFieldsForSectors, variantsExpectedForSectors } from "@/lib/org/shop-sector";
import {
  ProductFormDialog,
  type CategoryOption,
} from "@/components/shop/product-form-dialog";
import {
  ProductStockList,
  type ProductRow,
} from "@/components/shop/product-stock-list";

type CategoriesResponse = {
  categories: CategoryOption[];
  businessTypes: string[];
  primarySector: string | null;
};

export default function ServiceCatalogPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { activeBusinessType, activeShopSector, activeOrgSettings, enabledModules } = useAuthStore();
  const moduleEnabled = isModuleEnabled(enabledModules, "shop_inventory");
  const shopSectors = resolveShopBusinessTypes(activeOrgSettings?.shop, activeShopSector);
  const title = moduleLabel("shop_inventory", activeBusinessType ?? "SERVICE", shopSectors);

  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: orgId ? ["shop", orgId, "categories"] : ["disabled"],
    queryFn: () => apiFetch<CategoriesResponse>("/api/v1/shop/categories"),
    enabled: !!orgId && moduleEnabled,
  });

  const productsQuery = useQuery({
    queryKey: orgId ? ["shop", orgId, "products", "service-catalog"] : ["disabled"],
    queryFn: () => apiFetch<ProductRow[]>("/api/v1/shop/products"),
    enabled: !!orgId && moduleEnabled,
    placeholderData: keepPreviousData,
  });

  const businessTypes = useMemo(
    () => categoriesQuery.data?.businessTypes ?? [activeShopSector ?? "GENERAL"],
    [categoriesQuery.data?.businessTypes, activeShopSector]
  );

  const serviceProducts = useMemo(() => {
    const rows = productsQuery.data ?? [];
    return rows.filter((p) => p.variants.length > 0 && p.variants.every((v) => v.isUnlimited));
  }, [productsQuery.data]);

  const categories = useMemo(
    () => categoriesQuery.data?.categories ?? [],
    [categoriesQuery.data?.categories]
  );

  const lookup = useMemo(
    () => ({
      categoryLabel: (key: string | null) =>
        key ? catalogCategoryLabel(key) ?? key : "Uncategorized",
      subCategoryLabel: (categoryKey: string | null, key: string | null) =>
        key ? catalogSubCategoryLabel(categoryKey, key) ?? key : "",
    }),
    []
  );

  function invalidateAll() {
    if (!orgId) return;
    qc.invalidateQueries({ queryKey: ["shop", orgId, "products"] });
  }

  if (!moduleEnabled) {
    return (
      <p className="text-muted-foreground">
        Turn on {title} in Manage Organization → Features.
      </p>
    );
  }

  if (categoriesQuery.isLoading || productsQuery.isLoading) {
    return <PageLoader label="Loading service catalog..." />;
  }

  const sectorLabel = businessTypes.map((t) => getShopSectorConfig(t).label).join(" · ");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Service catalog</h1>
          <p className="text-sm text-muted-foreground">
            Services offered — {sectorLabel}
          </p>
        </div>
        <Button size="lg" className="rounded-xl" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-5 w-5" />
          Add service
        </Button>
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Services ({serviceProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProductStockList
            products={serviceProducts}
            categories={categories}
            lookup={lookup}
            isLoading={productsQuery.isFetching}
            isUpdating={false}
            onAddVariant={() => {}}
            onEditProduct={() => {}}
            onDeleteProduct={() => {}}
            onAdjustQty={() => {}}
            onEditVariant={() => {}}
            onPrintLabel={() => {}}
            onDeleteVariant={() => {}}
          />
        </CardContent>
      </Card>

      <ProductFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        orgId={orgId}
        categories={categories}
        attributeFields={inventoryFieldsForSectors(businessTypes)}
        variantsByDefault={variantsExpectedForSectors(businessTypes)}
        businessTypes={businessTypes}
        onCreated={() => invalidateAll()}
      />
    </div>
  );
}
