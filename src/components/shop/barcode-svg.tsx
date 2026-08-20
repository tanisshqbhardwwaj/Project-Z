"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

type BarcodeSvgProps = {
  value: string;
  height?: number;
  className?: string;
};

export function BarcodeSvg({ value, height = 48, className }: BarcodeSvgProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    const options = {
      displayValue: true,
      height,
      margin: 2,
      fontSize: 10,
      width: 1.25,
    };
    try {
      JsBarcode(ref.current, value, {
        ...options,
        format: value.length === 13 ? "EAN13" : "CODE128",
      });
    } catch {
      try {
        JsBarcode(ref.current, value, {
          ...options,
          format: "CODE128",
        });
      } catch {
        /* invalid barcode value */
      }
    }
    ref.current.setAttribute(
      "style",
      "display:block;max-width:100%;height:auto;margin:0 auto"
    );
  }, [value, height]);

  return (
    <svg
      ref={ref}
      className={className}
      style={{ display: "block", maxWidth: "100%", height: "auto", margin: "0 auto" }}
    />
  );
}
