import { isCapacitorNative } from "@/lib/platform/native";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
};

const RETAIL_FORMATS = ["ean_13", "ean_8", "code_128", "qr_code", "upc_a"] as const;

async function detectBarcodeFromBlob(blob: Blob): Promise<string> {
  const Detector = (
    window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike }
  ).BarcodeDetector;
  if (!Detector) return "";
  try {
    const bmp = await createImageBitmap(blob);
    const detector = new Detector({ formats: [...RETAIL_FORMATS] });
    const codes = await detector.detect(bmp);
    return codes[0]?.rawValue ?? "";
  } catch {
    return "";
  }
}

/** Google ML Kit live scanner on Android/iOS; falls back to still-image detection on web. */
export async function scanRetailBarcode(): Promise<string> {
  if (isCapacitorNative()) {
    try {
      const { BarcodeScanner, BarcodeFormat } = await import(
        "@capacitor-mlkit/barcode-scanning"
      );
      const perm = await BarcodeScanner.requestPermissions();
      if (perm.camera !== "granted" && perm.camera !== "limited") return "";

      const { barcodes } = await BarcodeScanner.scan({
        formats: [
          BarcodeFormat.Ean13,
          BarcodeFormat.Ean8,
          BarcodeFormat.Code128,
          BarcodeFormat.QrCode,
          BarcodeFormat.UpcA,
        ],
      });
      return barcodes[0]?.rawValue ?? "";
    } catch {
      /* fall through to camera snapshot + BarcodeDetector */
    }

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
        return detectBarcodeFromBlob(await res.blob());
      }
    } catch {
      return "";
    }
  }

  return "";
}

export { detectBarcodeFromBlob };
