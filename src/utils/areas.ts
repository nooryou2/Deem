// src/utils/areas.ts
//
// Bahrain's areas, grouped by governorate. Providers pick the areas they cover;
// homeowners pick the area(s) their property is in. A provider is shown to a
// homeowner only when their selections overlap.

export interface Area {
  id: string;
  label: string;
  governorate: string;
  /** Approximate centre, used to auto-pick the nearest area from a map pin. */
  lat: number;
  lng: number;
}

export const GOVERNORATES = [
  'Capital',
  'Muharraq',
  'Northern',
  'Southern',
] as const;

export const AREAS: Area[] = [
  // --- Capital Governorate ---
  { id: 'manama', label: 'Manama', governorate: 'Capital', lat: 26.2285, lng: 50.586 },
  { id: 'juffair', label: 'Juffair', governorate: 'Capital', lat: 26.2126, lng: 50.6017 },
  { id: 'adliya', label: 'Adliya', governorate: 'Capital', lat: 26.2144, lng: 50.592 },
  { id: 'seef', label: 'Seef', governorate: 'Capital', lat: 26.2361, lng: 50.5439 },
  { id: 'hoora', label: 'Hoora', governorate: 'Capital', lat: 26.2372, lng: 50.5883 },
  { id: 'gudaibiya', label: 'Gudaibiya', governorate: 'Capital', lat: 26.22, lng: 50.5893 },
  { id: 'salmaniya', label: 'Salmaniya', governorate: 'Capital', lat: 26.2226, lng: 50.5747 },
  { id: 'sanabis', label: 'Sanabis', governorate: 'Capital', lat: 26.2286, lng: 50.5477 },
  { id: 'zinj', label: 'Zinj', governorate: 'Capital', lat: 26.2143, lng: 50.5666 },
  { id: 'mahooz', label: 'Mahooz', governorate: 'Capital', lat: 26.2074, lng: 50.5926 },
  { id: 'umm_al_hassam', label: 'Umm Al Hassam', governorate: 'Capital', lat: 26.2005, lng: 50.5891 },
  { id: 'bilad_al_qadeem', label: 'Bilad Al Qadeem', governorate: 'Capital', lat: 26.2075, lng: 50.5578 },
  { id: 'jidhafs', label: 'Jidhafs', governorate: 'Capital', lat: 26.22, lng: 50.539 },
  { id: 'sagaya', label: 'Sanad', governorate: 'Capital', lat: 26.162, lng: 50.549 },

  // --- Muharraq Governorate ---
  { id: 'muharraq', label: 'Muharraq', governorate: 'Muharraq', lat: 26.2572, lng: 50.6119 },
  { id: 'hidd', label: 'Hidd', governorate: 'Muharraq', lat: 26.2432, lng: 50.6553 },
  { id: 'arad', label: 'Arad', governorate: 'Muharraq', lat: 26.2531, lng: 50.63 },
  { id: 'busaiteen', label: 'Busaiteen', governorate: 'Muharraq', lat: 26.2647, lng: 50.618 },
  { id: 'galali', label: 'Galali', governorate: 'Muharraq', lat: 26.2695, lng: 50.6367 },
  { id: 'dair', label: 'Dair', governorate: 'Muharraq', lat: 26.2811, lng: 50.6349 },
  { id: 'samaheej', label: 'Samaheej', governorate: 'Muharraq', lat: 26.2769, lng: 50.6208 },
  { id: 'amwaj', label: 'Amwaj Islands', governorate: 'Muharraq', lat: 26.2887, lng: 50.6614 },
  { id: 'diyar', label: 'Diyar Al Muharraq', governorate: 'Muharraq', lat: 26.3097, lng: 50.5931 },

  // --- Northern Governorate ---
  { id: 'hamad_town', label: 'Hamad Town', governorate: 'Northern', lat: 26.115, lng: 50.507 },
  { id: 'budaiya', label: 'Budaiya', governorate: 'Northern', lat: 26.2183, lng: 50.4519 },
  { id: 'saar', label: 'Saar', governorate: 'Northern', lat: 26.1932, lng: 50.4772 },
  { id: 'janabiya', label: 'Janabiya', governorate: 'Northern', lat: 26.1878, lng: 50.4646 },
  { id: 'barbar', label: 'Barbar', governorate: 'Northern', lat: 26.2225, lng: 50.4788 },
  { id: 'diraz', label: 'Diraz', governorate: 'Northern', lat: 26.227, lng: 50.467 },
  { id: 'bani_jamra', label: 'Bani Jamra', governorate: 'Northern', lat: 26.218, lng: 50.46 },
  { id: 'karzakan', label: 'Karzakan', governorate: 'Northern', lat: 26.0857, lng: 50.468 },
  { id: 'malkiya', label: 'Malkiya', governorate: 'Northern', lat: 26.1032, lng: 50.4573 },
  { id: 'sadad', label: 'Sadad', governorate: 'Northern', lat: 26.098, lng: 50.482 },
  { id: 'dumistan', label: 'Dumistan', governorate: 'Northern', lat: 26.117, lng: 50.47 },
  { id: 'hamala', label: 'Hamala', governorate: 'Northern', lat: 26.158, lng: 50.465 },

  // --- Southern Governorate ---
  { id: 'riffa', label: 'Riffa', governorate: 'Southern', lat: 26.13, lng: 50.555 },
  { id: 'east_riffa', label: 'East Riffa', governorate: 'Southern', lat: 26.123, lng: 50.572 },
  { id: 'west_riffa', label: 'West Riffa', governorate: 'Southern', lat: 26.118, lng: 50.53 },
  { id: 'isa_town', label: 'Isa Town', governorate: 'Southern', lat: 26.1736, lng: 50.5478 },
  { id: 'sitra', label: 'Sitra', governorate: 'Southern', lat: 26.154, lng: 50.621 },
  { id: 'awali', label: 'Awali', governorate: 'Southern', lat: 26.081, lng: 50.529 },
  { id: 'zallaq', label: 'Zallaq', governorate: 'Southern', lat: 26.048, lng: 50.487 },
  { id: 'askar', label: 'Askar', governorate: 'Southern', lat: 26.053, lng: 50.596 },
  { id: 'jaww', label: 'Jaww', governorate: 'Southern', lat: 25.993, lng: 50.59 },
  { id: 'durrat', label: 'Durrat Al Bahrain', governorate: 'Southern', lat: 25.846, lng: 50.615 },
  { id: 'hawar', label: 'Hawar Islands', governorate: 'Southern', lat: 25.65, lng: 50.77 },
];

export const AREA_LABELS: Record<string, string> = AREAS.reduce(
  (acc, a) => ({ ...acc, [a.id]: a.label }),
  {}
);

export function areaLabel(id: string): string {
  return AREA_LABELS[id] ?? id;
}

/** Areas grouped by governorate, for sectioned pickers. */
export function areasByGovernorate(): { governorate: string; areas: Area[] }[] {
  return GOVERNORATES.map((g) => ({
    governorate: g,
    areas: AREAS.filter((a) => a.governorate === g),
  }));
}

/**
 * True when a provider covers at least one of the homeowner's areas.
 * A provider with no areas set is treated as covering everywhere, so existing
 * accounts keep working until they configure their coverage.
 */
export function providerCoversAny(
  providerAreas: string[] | undefined,
  homeownerAreas: string[] | undefined
): boolean {
  if (!providerAreas || providerAreas.length === 0) return true;
  if (!homeownerAreas || homeownerAreas.length === 0) return true;
  return providerAreas.some((a) => homeownerAreas.includes(a));
}

/** Great-circle distance in km between two coordinates. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Finds the area whose centre is closest to a dropped map pin, so selecting a
 * location can fill in the area automatically. Returns null when the pin is far
 * outside Bahrain (beyond ~25km from any known area).
 */
export function nearestArea(coords: { lat: number; lng: number }): Area | null {
  let best: Area | null = null;
  let bestDist = Infinity;
  for (const area of AREAS) {
    const d = distanceKm(coords, area);
    if (d < bestDist) {
      bestDist = d;
      best = area;
    }
  }
  return bestDist <= 25 ? best : null;
}

/** Resolves area ids to full area objects (with coordinates) for map display. */
export function areasByIds(ids: string[]): Area[] {
  // find() returns the first match, so ids listed under two governorates
  // (e.g. Sitra) still resolve to a single entry.
  return ids
    .map((id) => AREAS.find((a) => a.id === id))
    .filter((a): a is Area => Boolean(a));
}
