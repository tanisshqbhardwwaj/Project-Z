"use client";

import JsBarcode from "jsbarcode";

export type BarcodeLabelPrintData = {
  name: string;
  barcode: string;
  priceLabel?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function barcodeToSvgMarkup(value: string): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const options = {
    displayValue: true,
    height: 32,
    margin: 2,
    fontSize: 10,
    width: 1.25,
  };

  try {
    JsBarcode(svg, value, {
      ...options,
      format: value.length === 13 ? "EAN13" : "CODE128",
    });
  } catch {
    JsBarcode(svg, value, { ...options, format: "CODE128" });
  }

  svg.setAttribute("style", "display:block;max-width:100%;height:auto;margin:0 auto");
  return svg.outerHTML;
}

function buildLabelHtml(data: BarcodeLabelPrintData): string {
  const priceHtml = data.priceLabel
    ? `<p class="price">${escapeHtml(data.priceLabel)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.name)} label</title>
  <style>
    @page { size: 58mm 40mm; margin: 2mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 2mm;
      font-family: system-ui, sans-serif;
      color: #000;
      background: #fff;
    }
    .label {
      width: 54mm;
      margin: 0 auto;
      text-align: center;
    }
    .name {
      margin: 0 0 1mm;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .price {
      margin: 0 0 1mm;
      font-size: 10px;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="label">
    <p class="name">${escapeHtml(data.name)}</p>
    ${priceHtml}
    ${barcodeToSvgMarkup(data.barcode)}
  </div>
  <script>
    window.addEventListener("load", function () {
      window.focus();
      window.print();
    });
    window.addEventListener("afterprint", function () {
      window.close();
    });
  </script>
</body>
</html>`;
}

/** Opens a minimal print window with only the shelf label (no dialog chrome). */
export function printBarcodeLabel(data: BarcodeLabelPrintData) {
  const html = buildLabelHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const popup = window.open(url, "_blank");

  if (!popup) {
    URL.revokeObjectURL(url);
    throw new Error("Allow pop-ups to print barcode labels");
  }

  popup.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
