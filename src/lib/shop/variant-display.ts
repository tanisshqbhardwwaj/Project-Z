/**
 * Single source of truth for how an inventory variant is written out.
 *
 * Rule: never identify a variant by the parent product name alone. Every product
 * selector, receipt line, report row and search index in the app funnels through
 * these helpers so a shop selling "T-Shirt — Black" in S/M/L can always tell the
 * three apart. Products that have no variant attributes render as just the name,
 * with no empty "Size: —" noise.
 */

export type VariantDescriptor = {
  /** Variant row name (usually the same as the parent product name). */
  name?: string | null;
  /** Parent product name when the variant row name differs. */
  productName?: string | null;
  size?: string | null;
  color?: string | null;
  /** Explicit variant label; wins over size/color when present. */
  variantLabel?: string | null;
  brand?: string | null;
  sku?: string | null;
  barcode?: string | null;
  unit?: string | null;
  /** Extra business-type attributes (material, model, weight, …). */
  attributes?: unknown;
};

export type VariantAttribute = { label: string; value: string };

function clean(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Human labels for the free-form attribute keys the product form can collect. */
const ATTRIBUTE_LABELS: Record<string, string> = {
  material: "Material",
  gender: "Gender",
  model: "Model",
  serial: "Serial",
  warrantyMonths: "Warranty",
  weight: "Weight",
  volume: "Volume",
  shade: "Shade",
  dimensions: "Size",
  metal: "Metal",
  purity: "Purity",
  grossWeight: "Gross wt",
  netWeight: "Net wt",
  author: "Author",
  publisher: "Publisher",
  duration: "Duration",
  batch: "Batch",
  fit: "Fit",
  pattern: "Pattern",
};

export function attributeLabel(key: string): string {
  return (
    ATTRIBUTE_LABELS[key] ??
    key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase())
  );
}

function readAttributes(raw: unknown): VariantAttribute[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const out: VariantAttribute[] = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const text =
      typeof value === "string"
        ? value.trim()
        : typeof value === "number"
          ? String(value)
          : "";
    if (!text) continue;
    out.push({ label: attributeLabel(key), value: text });
  }
  return out;
}

/** The product name to lead with. */
export function variantProductName(v: VariantDescriptor): string {
  return clean(v.productName) ?? clean(v.name) ?? "Item";
}

/**
 * Variant-distinguishing parts, in display order. Empty when the product has no
 * variant attributes at all.
 */
export function variantParts(v: VariantDescriptor): string[] {
  const parts: string[] = [];
  const color = clean(v.color);
  if (color) parts.push(color);

  const label = clean(v.variantLabel);
  const size = clean(v.size);
  if (label) {
    parts.push(label);
  } else if (size) {
    parts.push(`Size ${size}`);
  }

  return parts;
}

/** True when this row needs variant qualifiers to be identified unambiguously. */
export function hasVariantAttributes(v: VariantDescriptor): boolean {
  return variantParts(v).length > 0;
}

/**
 * Canonical display name: "Premium T-Shirt — Black — Size M".
 * Falls back to the bare product name for non-variant products.
 */
export function variantDisplayName(v: VariantDescriptor): string {
  const parts = variantParts(v);
  const base = variantProductName(v);
  return parts.length > 0 ? `${base} — ${parts.join(" — ")}` : base;
}

/** Short qualifier for compact rows: "Black · Size M" or "" when not a variant. */
export function variantSubtitle(v: VariantDescriptor): string {
  return variantParts(v).join(" · ");
}

export type VariantOptionLabelOptions = {
  /** Append the barcode so cashiers can confirm the scanned SKU. */
  withBarcode?: boolean;
  /** Append the SKU when there is no barcode. */
  withSku?: boolean;
  /** Trailing suffix such as a price or stock hint. */
  suffix?: string | null;
};

/**
 * Label for a `<option>` / list row in any product selector.
 * "Premium T-Shirt — Black — Size M — BAR002 — ₹499 (12 pcs left)"
 */
export function variantOptionLabel(
  v: VariantDescriptor,
  options: VariantOptionLabelOptions = {}
): string {
  const segments = [variantDisplayName(v)];
  const barcode = clean(v.barcode);
  const sku = clean(v.sku);
  if (options.withBarcode !== false && barcode) {
    segments.push(barcode);
  } else if (options.withSku !== false && sku) {
    segments.push(sku);
  }
  const label = segments.join(" — ");
  const suffix = clean(options.suffix);
  return suffix ? `${label} ${suffix}` : label;
}

/** Badge list for detail views: size, colour, SKU and business-type attributes. */
export function variantAttributeChips(v: VariantDescriptor): VariantAttribute[] {
  const chips: VariantAttribute[] = [];
  const size = clean(v.size);
  const color = clean(v.color);
  const brand = clean(v.brand);
  const sku = clean(v.sku);
  if (brand) chips.push({ label: "Brand", value: brand });
  if (size) chips.push({ label: "Size", value: size });
  if (color) chips.push({ label: "Colour", value: color });
  if (sku) chips.push({ label: "SKU", value: sku });
  chips.push(...readAttributes(v.attributes));
  return chips;
}

/**
 * Lowercased text blob used by every product search box so that queries like
 * "t-shirt m" or "BAR002" or "nike black" all match the right variant.
 */
export function variantSearchHaystack(
  v: VariantDescriptor & { description?: string | null; categoryLabel?: string | null; subCategoryLabel?: string | null }
): string {
  const bits = [
    clean(v.productName),
    clean(v.name),
    clean(v.brand),
    clean(v.size),
    clean(v.color),
    clean(v.variantLabel),
    clean(v.sku),
    clean(v.barcode),
    clean(v.unit),
    clean(v.description),
    clean(v.categoryLabel),
    clean(v.subCategoryLabel),
    ...readAttributes(v.attributes).map((a) => `${a.label} ${a.value}`),
  ].filter(Boolean) as string[];
  return bits.join(" ").toLowerCase();
}

/**
 * Every whitespace-separated term must appear somewhere in the haystack, so
 * "T-Shirt M" narrows to the M variants instead of returning all T-shirts.
 */
export function matchesVariantSearch(haystack: string, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  return terms.every((term) => haystack.includes(term));
}

/** Auto-generated variant SKU: "PRE-TSH-M-01". */
export function buildVariantSku(input: {
  productName: string;
  size?: string | null;
  color?: string | null;
  index: number;
}): string {
  const slug = (value: string, len: number) =>
    value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, len);

  const words = input.productName.trim().split(/\s+/).filter(Boolean);
  const namePart =
    words.length >= 2
      ? `${slug(words[0]!, 3)}-${slug(words[1]!, 3)}`
      : slug(words[0] ?? "ITEM", 6) || "ITEM";

  const bits = [namePart];
  const size = clean(input.size);
  const color = clean(input.color);
  if (color) bits.push(slug(color, 3));
  if (size) bits.push(slug(size, 4));
  bits.push(String(input.index).padStart(2, "0"));
  return bits.join("-");
}
