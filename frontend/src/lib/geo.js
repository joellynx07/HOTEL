/**
 * src/lib/geo.js
 * Distance calculation and geolocation helpers used by the discovery feed.
 */

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceKm(a, b) {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(h));
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  const rounded = km < 10 ? km.toFixed(1) : Math.round(km).toString();
  return `${rounded} km`;
}

export function sortByDistance(origin, items) {
  return items
    .map((item) => ({ ...item, distanceKm: haversineDistanceKm(origin, item) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Wraps the browser Geolocation API in a promise with a bounded timeout,
 * normalizing every failure mode into a discriminated result the UI can
 * switch on directly.
 */
export function requestBrowserLocation(options = {}) {
  const timeoutMs = options.timeoutMs ?? 8000;

  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve({ status: "unsupported" });
      return;
    }

    const timer = setTimeout(() => resolve({ status: "timeout" }), timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        resolve({
          status: "granted",
          coords: { lat: position.coords.latitude, lng: position.coords.longitude },
        });
      },
      (error) => {
        clearTimeout(timer);
        resolve(error.code === error.PERMISSION_DENIED ? { status: "denied" } : { status: "error", message: error.message });
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 }
    );
  });
}
