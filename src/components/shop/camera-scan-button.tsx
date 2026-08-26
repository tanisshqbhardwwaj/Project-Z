"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectBarcodeFromBlob, scanRetailBarcode } from "@/lib/shop/barcode-scan";

export function CameraScanButton({ onCode }: { onCode: (code: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const code = await detectBarcodeFromBlob(file);
    if (code) onCode(code);
  }

  async function openCamera() {
    const code = await scanRetailBarcode();
    if (code) {
      onCode(code);
      return;
    }
    inputRef.current?.click();
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        className="h-11 min-w-11 shrink-0 rounded-lg px-3"
        onClick={() => void openCamera()}
        aria-label="Scan with camera"
      >
        <Camera className="h-4 w-4" />
      </Button>
    </>
  );
}
