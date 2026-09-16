import type { ProviderAvailability } from '../types';

export function generateSlots(availability: ProviderAvailability): string[] {
  const { startHour, endHour, slotMinutes } = availability;
  if (
    ![startHour, endHour, slotMinutes].every(Number.isFinite) ||
    !Number.isInteger(startHour) ||
    !Number.isInteger(endHour) ||
    startHour < 0 ||
    endHour > 24 ||
    startHour >= endHour ||
    !Number.isInteger(slotMinutes) ||
    slotMinutes < 15 ||
    slotMinutes > 240
  )
    return [];
  const slots: string[] = [];
  for (let minute = startHour * 60; minute + slotMinutes <= endHour * 60; minute += slotMinutes) {
    slots.push(
      `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`,
    );
  }
  return slots;
}
export function isISODate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00`);
  return (
    Number.isFinite(parsed.getTime()) &&
    `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}` ===
      date
  );
}
export function isAvailableDate(date: string, availability: ProviderAvailability): boolean {
  if (!isISODate(date)) return false;
  const parsed = new Date(`${date}T12:00:00`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    !availability.blockedDates.includes(date) &&
    !(availability.weeklyOffDays ?? []).includes(parsed.getDay())
  );
}
export function isFutureSlot(date: string, slot: string, now = new Date()): boolean {
  const value = new Date(`${date}T${slot}:00`);
  return Number.isFinite(value.getTime()) && value > now;
}
