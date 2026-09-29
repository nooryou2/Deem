import { changeJobStatus } from './jobStatusService';
// src/services/bookingService.ts
import { db } from '@/config/firebase';
import { Booking,BookingStatus,MaintenanceCategory,ProviderAvailability } from '@/types';
import { generateSlots,isAvailableDate,isFutureSlot } from '@/utils/bookingValidation';
import {
Timestamp,
arrayRemove,
collection,
doc,
getDoc,
getDocs,
query,
runTransaction,
serverTimestamp,
setDoc,
updateDoc,
where
} from 'firebase/firestore';
export { generateSlots } from '@/utils/bookingValidation';

const BOOKINGS = 'bookings';
const AVAILABILITY = 'availability';
const BOOKED_SLOTS = 'bookedSlots'; // public per provider+date, for conflict checks

function slotDocId(providerId: string, date: string): string {
  return `${providerId}_${date}`;
}

const DEFAULT_AVAILABILITY: ProviderAvailability = {
  startHour: 9,
  endHour: 18,
  slotMinutes: 60,
  blockedDates: [],
};

// ---------------- Availability ----------------

export async function getAvailability(providerId: string): Promise<ProviderAvailability> {
  const snap = await getDoc(doc(db, AVAILABILITY, providerId));
    if (!snap.exists()) return DEFAULT_AVAILABILITY;
    const d = snap.data();
    return {
      startHour: typeof d.startHour === 'number' ? d.startHour : 9,
      endHour: typeof d.endHour === 'number' ? d.endHour : 18,
      slotMinutes: typeof d.slotMinutes === 'number' ? d.slotMinutes : 60,
      weeklyOffDays: Array.isArray(d.weeklyOffDays) ? d.weeklyOffDays : [],
      blockedDates: Array.isArray(d.blockedDates) ? d.blockedDates : [],
    };

}

export async function saveAvailability(
  providerId: string,
  availability: ProviderAvailability,
): Promise<void> {
  await setDoc(
    doc(db, AVAILABILITY, providerId),
    { ...availability, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function toggleBlockedDate(
  providerId: string,
  date: string,
): Promise<ProviderAvailability> {
  const current = await getAvailability(providerId);
  const blocked = current.blockedDates.includes(date)
    ? current.blockedDates.filter((d) => d !== date)
    : [...current.blockedDates, date];
  const updated = { ...current, blockedDates: blocked };
  await saveAvailability(providerId, updated);
  return updated;
}

// ---------------- Slot generation ----------------

/**
 * Returns the slots still available on a given date: all generated slots minus
 * those already booked (pending/accepted). Empty if the date is blocked.
 */
export async function getAvailableSlots(
  providerId: string,
  date: string,
): Promise<{
  availability: ProviderAvailability;
  blocked: boolean;
  slots: string[];
  takenSlots: string[];
}> {
  const availability = await getAvailability(providerId);
  if (!isAvailableDate(date, availability)) {
    return { availability, blocked: true, slots: [], takenSlots: [] };
  }
  const all = generateSlots(availability);
  // Read taken slots from the public bookedSlots doc (a customer can't read
  // other customers' raw bookings, but can read this aggregate).
  const taken = await getTakenSlots(providerId, date);
  const free = all.filter((s) => !taken.includes(s) && isFutureSlot(date, s));
  return { availability, blocked: false, slots: free, takenSlots: taken };
}

/**
 * Reads the publicly-readable list of taken slots for a provider on a date.
 */
export async function getTakenSlots(providerId: string, date: string): Promise<string[]> {
  const snap = await getDoc(doc(db, BOOKED_SLOTS, slotDocId(providerId, date)));
    if (!snap.exists()) return [];
    const slots = snap.data().slots;
    return Array.isArray(slots) ? slots : [];

}

// ---------------- Bookings ----------------

export interface CreateBookingInput {
  providerId: string;
  providerName: string;
  customerId: string;
  customerName: string;
  category: MaintenanceCategory;
  date: string;
  timeSlot: string;
  description: string;
  /** What the customer calls this unit, e.g. "Living room AC". */
  applianceName?: string;
  /** Which saved location the appliance is at. */
  locationId?: string | null;
  maintenanceItemId?: string | null;
  location?: import('@/types').SavedLocation | null;
  attachments?: import('@/types').Attachment[];
}

export async function createBooking(input: CreateBookingInput): Promise<string> {
  if (!input.locationId || !input.location)
    throw new Error('INCOMPLETE_BOOKING');
  const availability = await getAvailability(input.providerId);
  if (
    !isAvailableDate(input.date, availability) ||
    !generateSlots(availability).includes(input.timeSlot) ||
    !isFutureSlot(input.date, input.timeSlot)
  )
    throw new Error('SLOT_TAKEN');
  const bookingRef = doc(collection(db, BOOKINGS));
  const itemRef = input.maintenanceItemId
    ? doc(db, 'maintenanceItems', input.maintenanceItemId)
    : doc(collection(db, 'maintenanceItems'));
  const slotsRef = doc(db, BOOKED_SLOTS, slotDocId(input.providerId, input.date));
  await runTransaction(db, async (transaction) => {
    const slotsSnapshot = await transaction.get(slotsRef);
    const existingItem = input.maintenanceItemId ? await transaction.get(itemRef) : null;
    const previousBookingId = existingItem?.data()?.bookingId;
    const previousBooking = previousBookingId
      ? await transaction.get(doc(db, BOOKINGS, previousBookingId))
      : null;
    if (
      previousBooking?.exists() &&
      ['pending', 'accepted', 'in_progress'].includes(previousBooking.data().status)
    )
      throw new Error('APPLIANCE_BUSY');
    const currentAvailability = await transaction.get(doc(db, AVAILABILITY, input.providerId));
    const schedule = currentAvailability.exists()
      ? (currentAvailability.data() as ProviderAvailability)
      : DEFAULT_AVAILABILITY;
    if (
      !isAvailableDate(input.date, schedule) ||
      !generateSlots(schedule).includes(input.timeSlot) ||
      !isFutureSlot(input.date, input.timeSlot)
    )
      throw new Error('SLOT_TAKEN');
    if (existingItem && (!existingItem.exists() || existingItem.data().userId !== input.customerId))
      throw new Error('INVALID_APPLIANCE');
    const taken: string[] = slotsSnapshot.data()?.slots ?? [];
    if (taken.includes(input.timeSlot)) throw new Error('SLOT_TAKEN');
    transaction.set(bookingRef, {
      ...input,
      attachments: input.attachments ?? [],
      maintenanceItemId: itemRef.id,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    if (!input.maintenanceItemId) {
      transaction.set(itemRef, {
        userId: input.customerId,
        name: input.applianceName?.trim() || 'Booked service',
        category: input.category,
        frequency: 'every_6_months',
        lastServiceDate: null,
        customFrequencyDays: null,
        nextServiceDate: Timestamp.fromDate(new Date(`${input.date}T00:00:00`)),
        notes: input.description,
        notificationIds: [],
        locationId: input.locationId,
        bookingId: bookingRef.id,
        bookingStatus: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.update(itemRef, {
        requestId: null,
        bookingId: bookingRef.id,
        bookingStatus: 'pending',
        updatedAt: serverTimestamp(),
      });
    }
    transaction.set(slotsRef, {
      providerId: input.providerId,
      date: input.date,
      slots: [...taken, input.timeSlot],
      lastBookingId: bookingRef.id,
    });
  });
  return bookingRef.id;
}

/**
 * Frees a slot in the public aggregate (e.g. when a provider declines).
 */
export async function freeSlot(providerId: string, date: string, timeSlot: string): Promise<void> {
  await updateDoc(doc(db, BOOKED_SLOTS, slotDocId(providerId, date)), {
    slots: arrayRemove(timeSlot),
  });
}

export async function fetchProviderBookings(providerId: string): Promise<Booking[]> {
  const q = query(collection(db, BOOKINGS), where('providerId', '==', providerId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => mapBooking(d.id, d.data()));
  list.sort((a, b) => (a.date + a.timeSlot).localeCompare(b.date + b.timeSlot));
  return list;
}

export async function fetchCustomerBookings(customerId: string): Promise<Booking[]> {
  const q = query(collection(db, BOOKINGS), where('customerId', '==', customerId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => mapBooking(d.id, d.data()));
  list.sort((a, b) => (b.date + b.timeSlot).localeCompare(a.date + a.timeSlot));
  return list;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  await changeJobStatus('booking', id, status);
}

function mapBooking(id: string, data: any): Booking {
  return {
    id,
    providerId: data.providerId,
    providerName: data.providerName ?? 'Provider',
    customerId: data.customerId,
    customerName: data.customerName ?? 'Customer',
    category: data.category ?? 'custom',
    date: data.date,
    timeSlot: data.timeSlot,
    description: data.description ?? '',
    attachments: data.attachments ?? [],
    location: data.location ?? null,
    applianceName: data.applianceName ?? '',
    maintenanceItemId: data.maintenanceItemId ?? null,
    locationId: data.locationId ?? null,
    assignedEmployeeId: data.assignedEmployeeId ?? null,
    assignedEmployeeName: data.assignedEmployeeName ?? null,
    status: data.status ?? 'pending',
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString(),
  };
}

/**
 * Presents a provider's bookings using the same shape as service requests, so
 * both can be shown in one list without duplicating the UI.
 *
 * Booking statuses map onto request statuses: a booking is 'pending' until the
 * provider accepts, 'accepted' once they do, and 'completed' when finished.
 */
export async function fetchBookingsAsRequests(providerId: string) {
  const bookings = await fetchProviderBookings(providerId);
  return bookings.map((b) => ({
    id: b.id,
    homeownerId: b.customerId,
    homeownerName: b.customerName,
    providerId: b.providerId,
    providerName: b.providerName,
    maintenanceItemId: null,
    serviceType:
      (b as any).applianceName?.trim() || b.description?.split('\n')[0]?.trim() || 'Booked service',
    category: b.category,
    status: b.status === 'declined' ? 'declined' : b.status,
    notes: b.description ?? '',
    attachments: b.attachments ?? [],
    location: b.location ?? null,
    // Surfaced so the UI can show when the visit is scheduled.
    preferredDate: b.date,
    timeSlot: b.timeSlot,
    locationId: (b as any).locationId ?? null,
    isEmergency: false,
    appliances: [],
    assignedEmployeeId: (b as any).assignedEmployeeId ?? null,
    assignedEmployeeName: (b as any).assignedEmployeeName ?? null,
    isBooking: true as const,
    createdAt: b.createdAt,
    updatedAt: b.createdAt,
  }));
}

/**
 * Assigns an employee to a booking. Bookings are real jobs someone has to
 * attend, so they support assignment just like service requests do.
 */
export async function assignEmployeeToBooking(
  bookingId: string,
  employeeId: string,
  employeeName: string,
): Promise<void> {
  await updateDoc(doc(db, BOOKINGS, bookingId), {
    assignedEmployeeId: employeeId,
    assignedEmployeeName: employeeName,
  });
}

/**
 * Bookings assigned to an employee, shaped like service requests so their
 * "My Jobs" list can show both kinds together.
 */
export async function fetchBookingsForEmployee(employeeId: string) {
  const q = query(collection(db, BOOKINGS), where('assignedEmployeeId', '==', employeeId));
  const snap = await getDocs(q);
  const bookings = snap.docs.map((d) => mapBooking(d.id, d.data()));
  return bookings.map((b) => ({
    id: b.id,
    homeownerId: b.customerId,
    homeownerName: b.customerName,
    providerId: b.providerId,
    providerName: b.providerName,
    maintenanceItemId: b.maintenanceItemId ?? null,
    serviceType: (b as any).applianceName?.trim() || 'Booked service',
    category: b.category,
    status: b.status,
    notes: b.description ?? '',
    attachments: b.attachments ?? [],
    location: b.location ?? null,
    preferredDate: b.date,
    timeSlot: b.timeSlot,
    locationId: (b as any).locationId ?? null,
    isEmergency: false,
    appliances: [],
    assignedEmployeeId: (b as any).assignedEmployeeId ?? null,
    assignedEmployeeName: (b as any).assignedEmployeeName ?? null,
    isBooking: true as const,
    createdAt: b.createdAt,
    updatedAt: b.createdAt,
  }));
}
