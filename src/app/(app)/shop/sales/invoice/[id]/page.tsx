"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import {
  ShopInvoicePrint,
  type ShopInvoiceData,
} from "@/components/shop/shop-invoice-print";

type SaleDetail = ShopInvoiceData & {
  id: string;
  issueInvoice: boolean;
  organization: { name: string };
  createdBy: { name: string };
  itemsJson: { name: string; qty: number; priceRupees: number }[];
};

export default function ShopInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const orgId = useAuthStore((s) => s.activeOrganizationId);

  const { data, isLoading } = useQuery({
    queryKey: orgId ? [...queryKeys.modules.shop.sales(orgId), "detail", id] : ["disabled"],
    queryFn: () => apiFetch<SaleDetail>(`/api/v1/shop/sales/${id}`),
    enabled: !!orgId && !!id,
  });

  if (isLoading) return <PageLoader label="Loading invoice..." />;
  if (!data) {
    return (
      <div className="p-8 text-center">
        <p>Invoice not found</p>
        <Link href="/shop/sales" className="mt-4 inline-block">
          <Button variant="outline" className="rounded-xl">
            Back to sales
          </Button>
        </Link>
      </div>
    );
  }

  const invoice: ShopInvoiceData = {
    orgName: data.organization.name,
    billNumber: data.billNumber,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerGstin: data.customerGstin,
    salesBoyName: data.salesBoyName,
    paymentMethod: data.paymentMethod,
    items: data.itemsJson ?? [],
    totalPaise: data.totalPaise,
    gstPaise: data.gstPaise,
    createdAt: data.createdAt,
    cashierName: data.createdBy?.name,
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/shop/sales">
          <Button variant="outline" className="rounded-xl">
            Back
          </Button>
        </Link>
        <Button className="rounded-xl" onClick={() => window.print()}>
          Print invoice
        </Button>
      </div>
      <ShopInvoicePrint invoice={invoice} />
    </div>
  );
}
