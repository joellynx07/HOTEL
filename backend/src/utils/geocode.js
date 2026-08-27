/**
 * src/utils/geocode.js
 * Resolves a city + country to coordinates via OSM Nominatim, so a
 * property has a usable location the moment it's created.
 */

const FALLBACK_COORDS = { lat: 5.6037, lng: -0.187 }; // Accra, GH

export async function geocodeCity(city, countryCode) {
  const query = encodeURIComponent(`${city}, ${countryCode}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&countrycodes=${countryCode.toLowerCase()}&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Spynx/1.0 (contact@spynx.app)" },
    });
    if (!res.ok) return FALLBACK_COORDS;

    const results = await res.json();
    if (results.length === 0) return FALLBACK_COORDS;

    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    return FALLBACK_COORDS;
  }
}
