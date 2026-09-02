/** HTML print/download/PDF for staff attendance barcodes. */

import type { StaffBarcodeLabelFields } from "@/lib/staff/barcode-label-settings";
import { DEFAULT_STAFF_BARCODE_LABEL } from "@/lib/staff/barcode-label-settings";

export type StaffBarcodeLabelData = {
  staffName: string;
  roleTitle: string;
  phone?: string | null;
  email?: string | null;
  barcode: string;
  orgName?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function labelLines(
  data: StaffBarcodeLabelData,
  fields: StaffBarcodeLabelFields
): string[] {
  const lines: string[] = [];
  if (fields.showOrgName && data.orgName) lines.push(data.orgName);
  if (fields.showName) lines.push(data.staffName);
  if (fields.showRole && data.roleTitle) lines.push(data.roleTitle);
  if (fields.showPhone && data.phone?.trim()) lines.push(data.phone.trim());
  if (fields.showEmail && data.email?.trim()) lines.push(data.email.trim());
  return lines;
}

function labelHtml(
  data: StaffBarcodeLabelData,
  svgMarkup: string,
  fields: StaffBarcodeLabelFields
): string {
  const lines = labelLines(data, fields);
  const meta = lines
    .map((line, index) => {
      if (index === 0 && fields.showOrgName) {
        return `<p class="org">${escapeHtml(line)}</p>`;
      }
      if (index === (fields.showOrgName && data.orgName ? 1 : 0) && fields.showName) {
        return `<p class="name">${escapeHtml(line)}</p>`;
      }
      return `<p class="meta">${escapeHtml(line)}</p>`;
    })
    .join("");

  return `<div class="label">
    ${meta}
    <div class="barcode">${svgMarkup}</div>
    <p class="code">${escapeHtml(data.barcode)}</p>
  </div>`;
}

export function buildStaffBarcodeSheetHtml(
  labels: { data: StaffBarcodeLabelData; svg: string }[],
  fields: StaffBarcodeLabelFields = DEFAULT_STAFF_BARCODE_LABEL
): string {
  const body = labels.map((l) => labelHtml(l.data, l.svg, fields)).join("");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Staff attendance barcodes</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 16px; }
  .label { width: 62mm; border: 1px dashed #ccc; padding: 8px; margin: 8px; display: inline-block; text-align: center; vertical-align: top; }
  .org { font-size: 10px; color: #666; margin: 0 0 4px; }
  .name { font-size: 14px; font-weight: 700; margin: 0 0 2px; }
  .meta { font-size: 11px; color: #444; margin: 0 0 2px; }
  .code { font-family: monospace; font-size: 10px; margin: 6px 0 0; }
  .barcode svg { max-width: 100%; height: auto; }
  @media print { .label { page-break-inside: avoid; border: none; } }
</style></head><body>${body}</body></html>`;
}

export function downloadStaffBarcodeSheet(
  html: string,
  filename = "staff-attendance-barcode.html"
) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function printStaffBarcodeSheet(html: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => win.print();
}

export async function downloadStaffBarcodePdf(
  labels: { data: StaffBarcodeLabelData; svg: string }[],
  filename = "staff-attendance-barcodes.pdf",
  fields: StaffBarcodeLabelFields = DEFAULT_STAFF_BARCODE_LABEL
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const labelW = 90;
  const labelH = 52;
  const margin = 10;
  const cols = 2;
  let x = margin;
  let y = margin;
  let col = 0;

  for (const label of labels) {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#111111";
      ctx.font = "bold 16px system-ui,sans-serif";
      let ty = 18;
      for (const line of labelLines(label.data, fields)) {
        ctx.font =
          line === label.data.staffName
            ? "bold 16px system-ui,sans-serif"
            : "12px system-ui,sans-serif";
        ctx.fillText(line.slice(0, 42), 8, ty);
        ty += line === label.data.staffName ? 18 : 14;
      }
    }

    const img = new Image();
    const svgBlob = new Blob([label.svg], { type: "image/svg+xml" });
    const svgUrl = URL.createObjectURL(svgBlob);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not render barcode"));
      img.src = svgUrl;
    });

    if (ctx) {
      ctx.drawImage(img, 8, ty, 380, 48);
      ctx.font = "10px monospace";
      ctx.fillText(label.data.barcode, 8, ty + 58);
    }
    URL.revokeObjectURL(svgUrl);

    const dataUrl = canvas.toDataURL("image/png");
    pdf.addImage(dataUrl, "PNG", x, y, labelW, labelH);

    col += 1;
    if (col >= cols) {
      col = 0;
      x = margin;
      y += labelH + 6;
    } else {
      x += labelW + 6;
    }
    if (y + labelH > 280) {
      pdf.addPage();
      x = margin;
      y = margin;
      col = 0;
    }
  }

  pdf.save(filename);
}
