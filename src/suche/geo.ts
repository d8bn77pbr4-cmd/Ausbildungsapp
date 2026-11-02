const ERDRADIUS_KM = 6371;

/** Luftlinie zwischen zwei Koordinaten (Haversine). */
export function entfernungKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (grad: number) => (grad * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * ERDRADIUS_KM * Math.asin(Math.sqrt(h));
}
