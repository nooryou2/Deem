// src/utils/appliances.ts

// The fixed catalog of appliances a provider can register to fix, and a
// homeowner can report a problem with. 'other' allows a custom entry.
export interface Appliance {
  id: string;
  label: string;
  icon: string;
}

export const APPLIANCES: Appliance[] = [
  { id: 'ac', label: 'Air Conditioner', icon: '❄️' },
  { id: 'fridge', label: 'Refrigerator', icon: '🧊' },
  { id: 'washer', label: 'Washing Machine', icon: '🧺' },
  { id: 'water_heater', label: 'Water Heater', icon: '🔥' },
  { id: 'water_tank', label: 'Water Tank', icon: '🚰' },
  { id: 'plumbing', label: 'Plumbing', icon: '🔧' },
  { id: 'electrical', label: 'Electrical', icon: '⚡' },
  { id: 'oven', label: 'Oven / Stove', icon: '🍳' },
  { id: 'dishwasher', label: 'Dishwasher', icon: '🍽️' },
  { id: 'tv', label: 'TV / Electronics', icon: '📺' },
  { id: 'other', label: 'Other', icon: '🛠️' },
];

export const APPLIANCE_LABELS: Record<string, string> = APPLIANCES.reduce(
  (acc, a) => ({ ...acc, [a.id]: a.label }),
  {}
);

export const APPLIANCE_ICONS: Record<string, string> = APPLIANCES.reduce(
  (acc, a) => ({ ...acc, [a.id]: a.icon }),
  {}
);

export function applianceLabel(id: string): string {
  return APPLIANCE_LABELS[id] ?? id;
}

export function applianceIcon(id: string): string {
  return APPLIANCE_ICONS[id] ?? '🛠️';
}
