"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { BarcodeLabelPreview } from "@/components/shop/barcode-label";
import { LabelHeaderPicker } from "@/components/shop/label-header-picker";
import {
  LabelCopiesActions,
  clampLabelCopies,
} from "@/components/shop/label-copies-actions";
import type { FullLabelHeaderMode, LabelSize } from "@/lib/org/shop-settings";
import type { ShopLabelBranding } from "@/lib/org/shop-settings";
import { buildBarcodeLabelData } from "@/lib/shop/label-data";
import { printLabelSheet } from "@/lib/shop/label-sheet";
import { cn } from "@/lib/utils";

type LabelPayload = {
  item: {
    id: string;
    name: string;
    description: string | null;
    size: string | null;
    barcode: string | null;
    unit: string;
    sellPaise: string | null;
    costPaise: string | null;
  };
  branding: ShopLabelBranding;
};

function parseLabelSize(value: string | null): LabelSize {
  return value === "full" ? "full" : "small";
}

export default function InventoryLabelPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get("print") === "1";
  const size = parseLabelSize(searchParams.get("size"));
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const [copies, setCopies] = useState(() =>
    clampLabelCopies(Number(searchParams.get("copies") ?? 1))
  );
  const [headerMode, setHeaderMode] = useState<FullLabelHeaderMode>("both");

  const { data, isLoading, error } = useQuery({
    queryKey: orgId ? [...queryKeys.modules.shop.inventory(orgId), "label", id] : ["disabled"],
    queryFn: () => apiFetch<LabelPayload>(`/api/v1/shop/inventory/${id}`),
    enabled: !!orgId && !!id,
  });

  const labelData = useMemo(() => {
    if (!data?.item.barcode) return null;
    return {
      ...buildBarcodeLabelData(
        { ...data.item, barcode: data.item.barcode },
        data.branding
      ),
      headerMode,
    };
  }, [data, headerMode]);

  useEffect(() => {
    if (!autoPrint || !labelData) return;
    const timer = window.setTimeout(() => {
      try {
        printLabelSheet(size, labelData, copies);
      } catch {
        /* pop-up blocked — user can tap Print */
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [autoPrint, labelData, size, copies]);

  if (isLoading) return <PageLoader label="Loading label..." />;

  if (error) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8 text-center">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Failed to load label"}
        </p>
        <Link href="/shop/inventory" className="inline-block">
          <Button variant="outline" className="rounded-xl">
            Back to inventory
          </Button>
        </Link>
      </div>
    );
  }

  if (!data?.item.barcode || !labelData) {
    return (
      <div className="p-8 text-center">
        <p>Label not found or no barcode on this item.</p>
        <Link href="/shop/inventory" className="mt-4 inline-block">
          <Button variant="outline" className="rounded-xl">
            Back to inventory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto space-y-4 p-4 print:p-0",
        size === "full" ? "max-w-xs" : "max-w-sm"
      )}
    >
      <div className="label-print-toolbar space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/shop/inventory">
            <Button variant="outline" className="rounded-xl">
              Back
            </Button>
          </Link>
          <div className="flex gap-2">
            <Link href={`/shop/inventory/label/${id}?size=small`}>
              <Button
                variant={size === "small" ? "default" : "outline"}
                size="sm"
                className="rounded-xl"
              >
                Small tag
              </Button>
            </Link>
            <Link href={`/shop/inventory/label/${id}?size=full`}>
              <Button
                variant={size === "full" ? "default" : "outline"}
                size="sm"
                className="rounded-xl"
              >
                Full tag
              </Button>
            </Link>
          </div>
        </div>

        {size === "full" ? (
          <LabelHeaderPicker
            value={headerMode}
            onChange={setHeaderMode}
            hasLogo={Boolean(labelData.branding.logoUrl)}
          />
        ) : null}
      </div>

      <div className="flex justify-center">
        <BarcodeLabelPreview format={size} {...labelData} />
      </div>
      {copies > 1 ? (
        <p className="text-center text-xs text-muted-foreground">
          {copies} copies — one label per sticker sheet
        </p>
      ) : null}

      <div className="label-print-toolbar">
        <LabelCopiesActions
          size={size}
          data={labelData}
          copies={copies}
          onCopiesChange={setCopies}
        />
      </div>
    </div>
  );
}
