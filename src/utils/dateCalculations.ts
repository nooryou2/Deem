import { dateLocale } from '@/i18n/locale';
// src/utils/dateCalculations.ts
import { MaintenanceStatus,ServiceFrequency } from '@/types';
import { addDays,addMonths,addYears,differenceInCalendarDays,parseISO } from 'date-fns';

// How many days out counts as "Due Soon" rather than "Upcoming".
export const DUE_SOON_THRESHOLD_DAYS = 7;

/**
 * Given a starting date and a frequency, compute the next service date.
 */
export function calculateNextServiceDate(
  fromDate: Date,
  frequency: ServiceFrequency,
  customDays?: number | null,
): Date {
  switch (frequency) {
    case 'monthly':
      return addMonths(fromDate, 1);
    case 'every_3_months':
      return addMonths(fromDate, 3);
    case 'every_6_months':
      return addMonths(fromDate, 6);
    case 'yearly':
      return addYears(fromDate, 1);
    case 'custom':
      return addDays(fromDate, customDays && customDays > 0 ? customDays : 30);
    default:
      return addMonths(fromDate, 1);
  }
}

/**
 * Derive the live status of a maintenance item from its next service date.
 * Status is always computed, never trusted from stale stored data, so the
 * dashboard and list are correct even if the app was closed for a while.
 */
export function getMaintenanceStatus(nextServiceDateISO: string): MaintenanceStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDate = parseISO(nextServiceDateISO);
  nextDate.setHours(0, 0, 0, 0);

  const daysUntilDue = differenceInCalendarDays(nextDate, today);

  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= DUE_SOON_THRESHOLD_DAYS) return 'due_soon';
  return 'upcoming';
}

export function daysUntil(dateISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = parseISO(dateISO);
  date.setHours(0, 0, 0, 0);
  return differenceInCalendarDays(date, today);
}

export function formatFriendlyDate(dateISO: string): string {
  const date = parseISO(dateISO);
  return date.toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTimeSlot(slot?: string): string {
  if (!slot) return '';
  const [hour, minute] = slot.split(':').map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return slot;
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(dateLocale, { hour: 'numeric', minute: '2-digit' });
}
