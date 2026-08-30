export type AttendanceGeofence = {
  latitude: number;
  longitude: number;
  /** Allowed radius in meters (default 200). */
  radiusMeters: number;
  /** When true, check-in is rejected outside the radius. */
  required?: boolean;
};

export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function evaluateGeofence(
  geofence: AttendanceGeofence | null | undefined,
  latitude: number | undefined,
  longitude: number | undefined
): {
  geoVerified: boolean | null;
  geoDistanceMeters: number | null;
  error?: string;
} {
  if (!geofence) {
    return { geoVerified: null, geoDistanceMeters: null };
  }

  if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    if (geofence.required) {
      return {
        geoVerified: false,
        geoDistanceMeters: null,
        error: "Location is required to mark attendance. Allow location access and try again.",
      };
    }
    return { geoVerified: null, geoDistanceMeters: null };
  }

  const dist = distanceMeters(
    latitude,
    longitude,
    geofence.latitude,
    geofence.longitude
  );
  const inside = dist <= geofence.radiusMeters;
  if (!inside && geofence.required) {
    return {
      geoVerified: false,
      geoDistanceMeters: dist,
      error: `You must be within ${Math.round(geofence.radiusMeters)} m of the shop to check in (${Math.round(dist)} m away).`,
    };
  }

  return {
    geoVerified: inside,
    geoDistanceMeters: dist,
  };
}
