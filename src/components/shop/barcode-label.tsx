"use client";

import { BarcodeSvg } from "@/components/shop/barcode-svg";
import type { FullLabelHeaderMode, ShopLabelBranding } from "@/lib/org/shop-settings";

export type BarcodeLabelData = {
  name: string;
  barcode: string;
  description?: string | null;
  priceLabel?: string;
  mrpLabel?: string;
  productSize?: string | null;
  unit?: string;
  branding: ShopLabelBranding;
  headerMode?: FullLabelHeaderMode;
};

function ProductDetails({ data }: { data: BarcodeLabelData }) {
  const rows = [
    data.productSize ? `Size: ${data.productSize}` : null,
    `Code: ${data.barcode}`,
  ].filter(Boolean);

  if (rows.length === 0) return null;

  return (
    <ul className="label-product-details">
      {rows.map((row) => (
        <li key={row}>{row}</li>
      ))}
    </ul>
  );
}

function FullLabelHeader({
  branding,
  headerMode = "both",
}: {
  branding: ShopLabelBranding;
  headerMode?: FullLabelHeaderMode;
}) {
  const showLogo =
    branding.logoUrl && (headerMode === "both" || headerMode === "logo");
  const showName = headerMode === "both" || headerMode === "name";

  if (!showLogo && !showName) {
    return <p className="label-shop">{branding.shopName}</p>;
  }

  return (
    <div className="label-full-header">
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={branding.logoUrl!} alt="" className="label-logo" />
      ) : null}
      {showName ? <p className="label-shop">{branding.shopName}</p> : null}
    </div>
  );
}

/** Compact shelf tag — shop, item, size, price, barcode */
export function BarcodeLabelSmall({
  name,
  barcode,
  branding,
  productSize,
  priceLabel,
}: Pick<
  BarcodeLabelData,
  "name" | "barcode" | "branding" | "productSize" | "priceLabel"
>) {
  return (
    <div className="label-sheet label-sheet-small mx-auto bg-white text-black">
      <p className="label-shop-small">{branding.shopName}</p>
      <p className="label-product-small">{name}</p>
      {productSize ? (
        <p className="label-size-small">Size: {productSize}</p>
      ) : null}
      {priceLabel ? (
        <p className="label-price-small">{priceLabel}</p>
      ) : null}
      <div className="label-barcode-wrap">
        <BarcodeSvg value={barcode} height={24} />
      </div>
    </div>
  );
}

/** Full retail hang tag — shop header, product info, barcode, price */
export function BarcodeLabelFull({ data }: { data: BarcodeLabelData }) {
  const { name, barcode, description, priceLabel, mrpLabel, branding, headerMode } = data;
  const mode =
    headerMode === "logo" && !branding.logoUrl ? "name" : (headerMode ?? "both");

  return (
    <div className="label-sheet label-sheet-full mx-auto bg-white text-black">
      <FullLabelHeader branding={branding} headerMode={mode} />
      <p className="label-product-full">{name}</p>
      {description?.trim() ? (
        <p className="label-product-desc">{description.trim()}</p>
      ) : null}
      <ProductDetails data={data} />
      <div className="label-barcode-wrap label-barcode-wrap-full">
        <BarcodeSvg value={barcode} height={44} />
      </div>
      {mrpLabel ? <p className="label-mrp">MRP {mrpLabel}</p> : null}
      {priceLabel ? <p className="label-price">{priceLabel}</p> : null}
    </div>
  );
}

export function BarcodeLabelPreview({
  format,
  ...props
}: BarcodeLabelData & { format: "small" | "full" }) {
  if (format === "small") {
    return (
      <BarcodeLabelSmall
        name={props.name}
        barcode={props.barcode}
        branding={props.branding}
        productSize={props.productSize}
        priceLabel={props.priceLabel}
      />
    );
  }
  return <BarcodeLabelFull data={props} />;
}

export function BarcodeLabelStack({
  format,
  copies,
  ...props
}: BarcodeLabelData & { format: "small" | "full"; copies: number }) {
  const count = Math.min(Math.max(copies, 1), 100);
  return (
    <div className="label-stack">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="label-stack-item">
          <BarcodeLabelPreview format={format} {...props} />
        </div>
      ))}
    </div>
  );
}
