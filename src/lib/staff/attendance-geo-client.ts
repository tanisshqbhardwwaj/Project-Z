"use client";

export type ClientGeoReading = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
};

export async function readClientGeo(): Promise<ClientGeoReading> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Location is not available on this device.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        });
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Allow location to check in."
            : err.code === err.TIMEOUT
              ? "Location timed out. Try again near a window."
              : "Could not read your location.";
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 }
    );
  });
}
