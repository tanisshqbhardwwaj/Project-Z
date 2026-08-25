"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isCapacitorNative } from "@/lib/platform/native";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
};

async function detectBarcodeFromBlob(blob: Blob): Promise<string> {
  const Detector = (
    window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike }
  ).BarcodeDetector;
  if (!Detector) return "";
  try {
    const bmp = await createImageBitmap(blob);
    const detector = new Detector({
      formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a"],
    });
    const codes = await detector.detect(bmp);
    return codes[0]?.rawValue ?? "";
  } catch {
    return "";
  }
}

export function CameraScanButton({ onCode }: { onCode: (code: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const code = await detectBarcodeFromBlob(file);
    onCode(code);
  }

  async function openCamera() {
    if (isCapacitorNative()) {
      try {
        const { Camera: CapCamera, CameraResultType, CameraSource } = await import(
          "@capacitor/camera"
        );
        const photo = await CapCamera.getPhoto({
          quality: 80,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
        });
        if (photo.webPath) {
          const res = await fetch(photo.webPath);
          const blob = await res.blob();
          const code = await detectBarcodeFromBlob(blob);
          onCode(code);
          return;
        }
      } catch {
        /* fall through to file input */
      }
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
