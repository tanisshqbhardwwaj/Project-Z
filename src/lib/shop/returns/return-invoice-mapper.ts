import type { ShopInvoiceData, InvoiceLine } from "@/components/shop/shop-invoice-print";

type ReturnLine = {
  id: string;
  productName: string;
  size: string | null;
  variantLabel: string | null;
  sku: string | null;
  barcode: string | null;
  returnQty: number;
  unitPricePaise: string;
  isExchangeIn: boolean;
};

export type ReturnReceiptPrintSource = {
  id: string;
  returnNumber: string;
  type: "RETURN" | "EXCHANGE";
  returnValuePaise: string;
  exchangeValuePaise: string;
  additionalPaidPaise: string;
  refundAmountPaise: string;
  refundMethod: string;
  reason: string;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
  lines: ReturnLine[];
  shopSale: {
    billNumber: string | null;
    customerName: string | null;
  };
  createdBy: { name: string };
  staff: { name: string } | null;
  staffName: string | null;
  organization: { name: string };
};

function mapReturnLine(line: ReturnLine): InvoiceLine {
  return {
    name: line.productName,
    qty: line.returnQty,
    priceRupees: Number(line.unitPricePaise) / 100,
    size: line.size,
    variantLabel: line.variantLabel,
    sku: line.sku,
    barcode: line.barcode,
  };
}

export function returnReceiptToShopInvoice(
  data: ReturnReceiptPrintSource
): ShopInvoiceData {
  const returned = data.lines.filter((l) => !l.isExchangeIn);
  const replacements = data.lines.filter((l) => l.isExchangeIn);
  const isExchange = data.type === "EXCHANGE";
  const refund = BigInt(data.refundAmountPaise);
  const extra = BigInt(data.additionalPaidPaise);
  const totalPaise =
    extra > BigInt(0) ? data.additionalPaidPaise : data.refundAmountPaise;

  return {
    orgName: data.organization.name,
    billNumber: data.returnNumber,
    documentKind: isExchange ? "EXCHANGE_INVOICE" : "CREDIT_NOTE",
    originalBillNumber: data.shopSale.billNumber,
    customerName: data.customerName ?? data.shopSale.customerName,
    customerPhone: data.customerPhone,
    paymentMethod:
      data.refundMethod === "CREDIT" ? "Store credit" : data.refundMethod,
    items: returned.map(mapReturnLine),
    replacementItems: isExchange ? replacements.map(mapReturnLine) : undefined,
    totalPaise,
    createdAt: data.createdAt,
    cashierName: data.staff?.name ?? data.staffName ?? data.createdBy.name,
    returnMeta: {
      returnValueRupees: Number(data.returnValuePaise) / 100,
      exchangeValueRupees: isExchange
        ? Number(data.exchangeValuePaise) / 100
        : undefined,
      refundRupees: Number(data.refundAmountPaise) / 100,
      additionalPaidRupees: Number(data.additionalPaidPaise) / 100,
      refundMethod: data.refundMethod,
      reason: data.reason,
      netLabel:
        extra > BigInt(0)
          ? "Collected from customer"
          : refund > BigInt(0)
            ? "Refunded to customer"
            : "Settled — nothing due",
    },
  };
}
