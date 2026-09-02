"use client";

import JsBarcode from "jsbarcode";
import type { LabelSize } from "@/lib/org/shop-settings";
import type { BarcodeLabelData } from "@/components/shop/barcode-label";

const LABEL_DIMS: Record<LabelSize, { w: string; h: string; barcodeH: number }> = {
  small: { w: "50mm", h: "26mm", barcodeH: 16 },
  full: { w: "50mm", h: "82mm", barcodeH: 44 },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function barcodeToSvgMarkup(value: string, height: number, width = 1.4): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const options = {
    displayValue: true,
    height,
    margin: 1,
    fontSize: height > 30 ? 10 : 8,
    width,
  };

  try {
    JsBarcode(svg, value, {
      ...options,
      format: value.length === 13 ? "EAN13" : "CODE128",
    });
  } catch {
    JsBarcode(svg, value, { ...options, format: "CODE128" });
  }

  svg.setAttribute(
    "style",
    "display:block;width:100%;max-width:100%;height:auto;margin:0 auto"
  );
  return svg.outerHTML;
}

/** Small sticker — shop, item, size, price, barcode */
function smallLabelHtml(data: BarcodeLabelData): string {
  const dims = LABEL_DIMS.small;
  const sizeHtml = data.productSize
    ? `<p class="size">Size: ${escapeHtml(data.productSize)}</p>`
    : "";
  const priceHtml = data.priceLabel
    ? `<p class="price-sm">${escapeHtml(data.priceLabel)}</p>`
    : "";

  return `<div class="label label-small">
    <p class="shop-sm">${escapeHtml(data.branding.shopName)}</p>
    <p class="product-sm">${escapeHtml(data.name)}</p>
    ${sizeHtml}
    ${priceHtml}
    <div class="barcode">${barcodeToSvgMarkup(data.barcode, dims.barcodeH, 1.35)}</div>
  </div>`;
}

function fullLabelHtml(data: BarcodeLabelData): string {
  const { branding } = data;
  const dims = LABEL_DIMS.full;
  let headerMode = data.headerMode ?? "both";
  if (headerMode === "logo" && !branding.logoUrl) headerMode = "name";

  const showLogo = branding.logoUrl && (headerMode === "both" || headerMode === "logo");
  const showName = headerMode === "both" || headerMode === "name";
  const logo = showLogo
    ? `<img src="${escapeHtml(branding.logoUrl!)}" alt="" class="logo" />`
    : "";
  const shopName = showName
    ? `<p class="shop">${escapeHtml(branding.shopName)}</p>`
    : "";
  const headerHtml =
    logo || shopName ? `<div class="full-header">${logo}${shopName}</div>` : "";

  const desc = data.description?.trim()
    ? `<p class="product-desc">${escapeHtml(data.description.trim())}</p>`
    : "";
  const detailRows = [
    data.productSize ? `Size: ${escapeHtml(data.productSize)}` : "",
    `Code: ${escapeHtml(data.barcode)}`,
  ].filter(Boolean);
  const detailsHtml = detailRows.length
    ? `<ul class="product-details">${detailRows.map((r) => `<li>${r}</li>`).join("")}</ul>`
    : "";
  const mrpHtml = data.mrpLabel
    ? `<p class="mrp">MRP ${escapeHtml(data.mrpLabel)}</p>`
    : "";
  const priceHtml = data.priceLabel
    ? `<p class="price">${escapeHtml(data.priceLabel)}</p>`
    : "";

  return `<div class="label label-full">
    ${headerHtml}
    <p class="product">${escapeHtml(data.name)}</p>
    ${desc}
    ${detailsHtml}
    <div class="barcode">${barcodeToSvgMarkup(data.barcode, dims.barcodeH)}</div>
    ${mrpHtml}
    ${priceHtml}
  </div>`;
}

function labelBlock(size: LabelSize, data: BarcodeLabelData): string {
  return size === "small" ? smallLabelHtml(data) : fullLabelHtml(data);
}

function sheetStyles(size: LabelSize): string {
  const dims = LABEL_DIMS[size];
  return `
    @page {
      size: A4;
      margin: 8mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: system-ui, sans-serif;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      display: flex;
      flex-wrap: wrap;
      gap: 3mm;
      align-content: flex-start;
      justify-content: flex-start;
    }
    .label {
      width: ${dims.w};
      height: ${dims.h};
      margin: 0;
      padding: 1.5mm;
      overflow: hidden;
      text-align: center;
      background: #fff;
      border: 1px dashed #bbb;
      page-break-inside: avoid;
      break-inside: avoid;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .label-small {
      padding: 1mm 1.5mm 0.5mm;
      justify-content: flex-start;
    }
    .shop-sm {
      margin: 0 0 0.5mm;
      font-size: 7px;
      font-weight: 700;
      line-height: 1.1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
    }
    .product-sm {
      margin: 0 0 0.5mm;
      font-size: 7px;
      font-weight: 600;
      line-height: 1.1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
    }
    .size {
      margin: 0 0 0.5mm;
      font-size: 6.5px;
      line-height: 1.1;
      color: #333;
    }
    .price-sm {
      margin: 0 0 0.3mm;
      font-size: 9px;
      font-weight: 800;
      line-height: 1;
    }
    .label-small .barcode {
      margin: 0.3mm 0 0;
      width: 100%;
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .label-small .barcode svg {
      max-height: 12mm;
      width: 100% !important;
    }
    .label-full {
      justify-content: flex-start;
      padding: 2.5mm 2mm;
    }
    .shop {
      margin: 0 0 1.5mm;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.15;
    }
    .logo {
      display: block;
      max-width: 18mm;
      max-height: 12mm;
      margin: 0 auto 1.5mm;
      object-fit: contain;
    }
    .full-header .shop { margin: 0 0 1.5mm; }
    .product-desc {
      margin: 0 0 1.5mm;
      font-size: 8px;
      line-height: 1.35;
      color: #333;
    }
    .product-details {
      margin: 0 0 1.5mm;
      padding: 0;
      list-style: none;
      font-size: 7px;
      color: #555;
      line-height: 1.4;
    }
    .product {
      margin: 0 0 1.5mm;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.25;
    }
    .barcode { margin: 0 0 1.5mm; width: 100%; }
    .mrp {
      margin: 0;
      font-size: 9px;
      color: #666;
      text-decoration: line-through;
    }
    .price {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      line-height: 1;
    }
    @media screen {
      body { background: #e8ecf0; }
      .sheet {
        max-width: 210mm;
        margin: 0 auto;
        padding: 8mm;
        background: #fff;
        box-shadow: 0 2px 12px rgba(0,0,0,0.12);
      }
      .label { background: #fff; }
    }
    @media print {
      html, body { background: #fff !important; }
      .sheet { padding: 0; box-shadow: none; }
      .label { border-color: #ccc; }
      .print-hint { display: none !important; }
    }
  `;
}

export function buildLabelSheetHtml(
  size: LabelSize,
  data: BarcodeLabelData,
  copies: number
): string {
  const count = Math.min(Math.max(copies, 1), 500);
  const blocks = Array.from({ length: count }, () => labelBlock(size, data)).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.name)} labels x${count}</title>
  <style>${sheetStyles(size)}</style>
</head>
<body>
  <p class="print-hint" style="font-size:11px;color:#555;text-align:center;margin:6mm 0;">
    ${count} label${count > 1 ? "s" : ""} · A4 sheet. In print settings choose <strong>A4</strong> and turn off &ldquo;Headers and footers&rdquo;, then cut along the dashed lines.
  </p>
  <div class="sheet">${blocks}</div>
</body>
</html>`;
}

function buildLabelSheetHtmlWithPrint(
  size: LabelSize,
  data: BarcodeLabelData,
  copies: number
): string {
  const base = buildLabelSheetHtml(size, data, copies);
  return base.replace(
    "</body>",
    `<style>.print-hint{display:none!important}@media print{.print-hint{display:none!important}}</style>
<script>
  window.addEventListener("load", function () {
    window.focus();
    setTimeout(function () { window.print(); }, 300);
  });
  window.addEventListener("afterprint", function () {
    try { window.close(); } catch (_) {}
  });
</script>
</body>`
  );
}

function safeFilename(name: string): string {
  return name.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "label";
}

export function downloadLabelSheet(
  size: LabelSize,
  data: BarcodeLabelData,
  copies: number
) {
  const count = Math.min(Math.max(copies, 1), 500);
  const html = buildLabelSheetHtml(size, data, count);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(data.name)}-${size}-${count}.html`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function printLabelSheet(size: LabelSize, data: BarcodeLabelData, copies: number) {
  const html = buildLabelSheetHtmlWithPrint(size, data, copies);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (!popup) {
    URL.revokeObjectURL(url);
    throw new Error("Allow pop-ups to print labels");
  }
  popup.addEventListener(
    "load",
    () => {
      URL.revokeObjectURL(url);
    },
    { once: true }
  );
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
