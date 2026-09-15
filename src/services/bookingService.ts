// src/services/bookingService.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  Booking,
  BookingStatus,
  ProviderAvailability,
  MaintenanceCategory,
} from '@/types';

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
  try {
    const snap = await getDoc(doc(db, AVAILABILITY, providerId));
    if (!snap.exists()) return DEFAULT_AVAILABILITY;
    const d = snap.data();
    return {
      startHour: typeof d.startHour === 'number' ? d.startHour : 9,
      endHour: typeof d.endHour === 'number' ? d.endHour : 18,
      slotMinutes: typeof d.slotMinutes === 'number' ? d.slotMinutes : 60,
      blockedDates: Array.isArray(d.blockedDates) ? d.blockedDates : [],
    };
  } catch {
    return DEFAULT_AVAILABILITY;
  }
}

export async function saveAvailability(
  providerId: string,
  availability: ProviderAvailability
): Promise<void> {
  await setDoc(
    doc(db, AVAILABILITY, providerId),
    { ...availability, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function toggleBlockedDate(
  providerId: string,
  date: string
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
 * Generates the full list of time-slot labels for a provider based on their
 * working hours and slot duration. e.g. 9-12 with 30-min slots -> 9:00, 9:30...
 */
export function generateSlots(availability: ProviderAvailability): string[] {
  const slots: string[] = [];
  const startMin = availability.startHour * 60;
  const endMin = availability.endHour * 60;
  for (let m = startMin; m + availability.slotMinutes <= endMin; m += availability.slotMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return slots;
}

/**
 * Returns the slots still available on a given date: all generated slots minus
 * those already booked (pending/accepted). Empty if the date is blocked.
 */
export async function getAvailableSlots(
  providerId: string,
  date: string
): Promise<{ availability: ProviderAvailability; blocked: boolean; slots: string[]; takenSlots: string[] }> {
  const availability = await getAvailability(providerId);
  if (availability.blockedDates.includes(date)) {
    return { availability, blocked: true, slots: [], takenSlots: [] };
  }
  const all = generateSlots(availability);
  // Read taken slots from the public bookedSlots doc (a customer can't read
  // other customers' raw bookings, but can read this aggregate).
  const taken = await getTakenSlots(providerId, date);
  const free = all.filter((s) => !taken.includes(s));
  return { availability, blocked: false, slots: free, takenSlots: taken };
}

/**
 * Reads the publicly-readable list of taken slots for a provider on a date.
 */
export async function getTakenSlots(providerId: string, date: string): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, BOOKED_SLOTS, slotDocId(providerId, date)));
    if (!snap.exists()) return [];
    const slots = snap.data().slots;
    return Array.isArray(slots) ? slots : [];
  } catch {
    return [];
  }
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
}

export async function createBooking(input: CreateBookingInput): Promise<string> {
  // Final conflict guard using the public taken-slots doc (readable by all).
  const taken = await getTakenSlots(input.providerId, input.date);
  if (taken.includes(input.timeSlot)) {
    throw new Error('SLOT_TAKEN');
  }

  const ref = await addDoc(collection(db, BOOKINGS), {
    ...input,
    status: 'pending' as BookingStatus,
    createdAt: serverTimestamp(),
  });

  // A booking is also something the homeowner wants tracked, so create a
  // matching maintenance item. The two are linked by id in both directions so
  // status changes on one can be reflected on the other.
  try {
    const itemRef = await addDoc(collection(db, 'maintenanceItems'), {
      userId: input.customerId,
      name: input.applianceName?.trim() || 'Booked service',
      category: input.category,
      frequency: 'yearly',
      customFrequencyDays: null,
      lastServiceDate: null,
      // The booking date is when the service is due.
      nextServiceDate: Timestamp.fromDate(new Date(`${input.date}T00:00:00`)),
      notes: input.description ?? '',
      notificationIds: [],
      locationId: input.locationId ?? null,
      bookingId: ref.id,
      // Mirrors the booking's state so the homeowner can see at a glance that
      // this task is still awaiting the provider's confirmation.
      bookingStatus: 'pending' as BookingStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, BOOKINGS, ref.id), { maintenanceItemId: itemRef.id });
  } catch (e) {
    // The booking itself succeeded; a failure here shouldn't lose it.
    console.log('Could not create maintenance item for booking:', e);
  }

  // Record the slot as taken in the public aggregate so other customers can't
  // book it. Merge-append the slot to the array.
  await setDoc(
    doc(db, BOOKED_SLOTS, slotDocId(input.providerId, input.date)),
    { providerId: input.providerId, date: input.date, slots: [...taken, input.timeSlot] },
    { merge: true }
  );

  return ref.id;
}

/**
 * Frees a slot in the public aggregate (e.g. when a provider declines).
 */
export async function freeSlot(providerId: string, date: string, timeSlot: string): Promise<void> {
  const taken = await getTakenSlots(providerId, date);
  await setDoc(
    doc(db, BOOKED_SLOTS, slotDocId(providerId, date)),
    { providerId, date, slots: taken.filter((s) => s !== timeSlot) },
    { merge: true }
  );
}

async function fetchProviderBookingsForDate(providerId: string, date: string): Promise<Booking[]> {
  const q = query(
    collection(db, BOOKINGS),
    where('providerId', '==', providerId),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapBooking(d.id, d.data()));
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
  await updateDoc(doc(db, BOOKINGS, id), { status });

  // Keep the homeowner's linked maintenance item in step, so their task shows
  // the same Pending / Accepted / Declined state as the booking.
  try {
    const snap = await getDoc(doc(db, BOOKINGS, id));
    if (!snap.exists()) return;
    const data = snap.data();
    const itemId = data.maintenanceItemId ?? null;

    if (itemId) {
      await updateDoc(doc(db, 'maintenanceItems', itemId), { bookingStatus: status });
    }

    // A completed booking is a service that actually happened, so record the
    // visit rather than waiting for the homeowner to log it by hand. Without
    // this the Serviced history stays empty and there's nothing to review.
    if (status === 'completed' && !data.historyLogged) {
      await addDoc(collection(db, 'maintenanceHistory'), {
        maintenanceItemId: itemId,
        maintenanceItemName: data.applianceName?.trim() || 'Booked service',
        userId: data.customerId,
        completedDate: Timestamp.fromDate(new Date(`${data.date}T00:00:00`)),
        providerId: data.providerId,
        providerName: data.providerName,
        bookingId: id,
        createdAt: serverTimestamp(),
      });
      // Guard against a second entry if the status is set again.
      await updateDoc(doc(db, BOOKINGS, id), { historyLogged: true });

      if (itemId) {
        await updateDoc(doc(db, 'maintenanceItems', itemId), {
          lastServiceDate: Timestamp.fromDate(new Date(`${data.date}T00:00:00`)),
        });
      }
    }
  } catch (e) {
    console.log('Could not sync maintenance item status:', e);
  }
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
      (b as any).applianceName?.trim() ||
      b.description?.split('\n')[0]?.trim() ||
      'Booked service',
    category: b.category,
    status: b.status === 'declined' ? 'declined' : b.status,
    notes: b.description ?? '',
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
  employeeName: string
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
  const q = query(
    collection(db, BOOKINGS),
    where('assignedEmployeeId', '==', employeeId)
  );
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
