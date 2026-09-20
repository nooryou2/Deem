// src/utils/maintenanceTemplates.ts
import { MaintenanceTemplate } from '@/types';

// Mirrors the "Suggested Default Maintenance Templates" section of the spec.
// Shown to users as one-tap quick-add options when creating their first items.
export const MAINTENANCE_TEMPLATES: MaintenanceTemplate[] = [
  { category: 'ac', itemName: 'AC Unit', taskName: 'Filter Cleaning', frequency: 'monthly' },
  { category: 'ac', itemName: 'AC Unit', taskName: 'Full Service', frequency: 'every_6_months' },
  {
    category: 'water_filter',
    itemName: 'Water Filter',
    taskName: 'Filter Replacement',
    frequency: 'every_6_months',
  },
  { category: 'water_tank', itemName: 'Water Tank', taskName: 'Cleaning', frequency: 'yearly' },
  {
    category: 'smoke_detector',
    itemName: 'Smoke Detector',
    taskName: 'Battery Check',
    frequency: 'every_6_months',
  },
  {
    category: 'fire_extinguisher',
    itemName: 'Fire Extinguisher',
    taskName: 'Inspection',
    frequency: 'yearly',
  },
  {
    category: 'water_heater',
    itemName: 'Water Heater',
    taskName: 'Inspection',
    frequency: 'yearly',
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  ac: 'AC',
  water_filter: 'Water Filter',
  water_tank: 'Water Tank',
  smoke_detector: 'Smoke Detector',
  fire_extinguisher: 'Fire Extinguisher',
  water_heater: 'Water Heater',
  custom: 'Custom',
};

export const CATEGORY_ICONS: Record<string, string> = {
  ac: '❄️',
  water_filter: '💧',
  water_tank: '🚰',
  smoke_detector: '🚨',
  fire_extinguisher: '🧯',
  water_heater: '🔥',
  custom: '🛠️',
};

export const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  every_3_months: 'Every 3 Months',
  every_6_months: 'Every 6 Months',
  yearly: 'Yearly',
  custom: 'Custom',
};
