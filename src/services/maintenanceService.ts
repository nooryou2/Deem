// src/services/maintenanceService.ts
import { auth,db } from '@/config/firebase';
import { MaintenanceCategory,MaintenanceItem,ServiceFrequency } from '@/types';
import { calculateNextServiceDate } from '@/utils/dateCalculations';
import {
DocumentData,
Timestamp,
UpdateData,
addDoc,
collection,
deleteDoc,
doc,
getDoc,
getDocs,
onSnapshot,
query,
serverTimestamp,
updateDoc,
where,
} from 'firebase/firestore';
import { cancelMaintenanceReminders,scheduleMaintenanceReminders } from './notificationService';

const COLLECTION = 'maintenanceItems';

export interface CreateMaintenanceInput {
  brandModel?: string;
  serialNumber?: string;
  warrantyExpiry?: string | null;
  warrantyNotes?: string;
  attachments?: import('@/types').Attachment[];
  userId: string;
  name: string;
  category: MaintenanceCategory;
  frequency: ServiceFrequency;
  customFrequencyDays?: number | null;
  lastServiceDate?: Date | null;
  notes?: string;
  /** Which saved location this appliance is at. */
  locationId?: string | null;
}

/**
 * Fetches a single maintenance item by id. Used by the detail screen to
 * refresh in place after marking complete, without depending on the list.
 */
export async function fetchSingleMaintenanceItem(id: string): Promise<MaintenanceItem | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    userId: data.userId,
    name: data.name,
    category: data.category,
    frequency: data.frequency,
    customFrequencyDays: data.customFrequencyDays ?? null,
    lastServiceDate: tsToISO(data.lastServiceDate),
    nextServiceDate: tsToISO(data.nextServiceDate) ?? new Date().toISOString(),
    notes: data.notes ?? '',
    brandModel: data.brandModel ?? '',
    serialNumber: data.serialNumber ?? '',
    warrantyExpiry: data.warrantyExpiry ?? null,
    warrantyNotes: data.warrantyNotes ?? '',
    attachments: data.attachments ?? [],
    notificationIds: data.notificationIds ?? [],
    locationId: data.locationId ?? null,
    bookingStatus: data.bookingStatus ?? null,
    createdAt: tsToISO(data.createdAt) ?? new Date().toISOString(),
    updatedAt: tsToISO(data.updatedAt) ?? new Date().toISOString(),
  };
}

/**
 * One-time fetch of a user's maintenance items. More reliable than the live
 * listener on restricted networks where the realtime push can stall.
 */
export async function fetchMaintenanceItems(userId: string): Promise<MaintenanceItem[]> {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const items: MaintenanceItem[] = snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      name: data.name,
      category: data.category,
      frequency: data.frequency,
      customFrequencyDays: data.customFrequencyDays ?? null,
      lastServiceDate: tsToISO(data.lastServiceDate),
      nextServiceDate: tsToISO(data.nextServiceDate) ?? new Date().toISOString(),
      notes: data.notes ?? '',
      brandModel: data.brandModel ?? '',
      serialNumber: data.serialNumber ?? '',
      warrantyExpiry: data.warrantyExpiry ?? null,
      warrantyNotes: data.warrantyNotes ?? '',
      attachments: data.attachments ?? [],
      notificationIds: data.notificationIds ?? [],
      locationId: data.locationId ?? null,
      bookingStatus: data.bookingStatus ?? null,
      createdAt: tsToISO(data.createdAt) ?? new Date().toISOString(),
      updatedAt: tsToISO(data.updatedAt) ?? new Date().toISOString(),
    };
  });
  items.sort((a, b) => a.nextServiceDate.localeCompare(b.nextServiceDate));
  return items;
}

/**
 * Subscribes to a user's maintenance items in real time. Returns an
 * unsubscribe function — call it in a useEffect cleanup.
 */
export function subscribeToMaintenanceItems(
  userId: string,
  onChange: (items: MaintenanceItem[]) => void,
  onError: (error: Error) => void,
): () => void {
  // Query by userId only (no orderBy) so this works without a composite
  // Firestore index. We sort by nextServiceDate in JS below instead.
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MaintenanceItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          name: data.name,
          category: data.category,
          frequency: data.frequency,
          customFrequencyDays: data.customFrequencyDays ?? null,
          lastServiceDate: tsToISO(data.lastServiceDate),
          nextServiceDate: tsToISO(data.nextServiceDate) ?? new Date().toISOString(),
          notes: data.notes ?? '',
          brandModel: data.brandModel ?? '',
          serialNumber: data.serialNumber ?? '',
          warrantyExpiry: data.warrantyExpiry ?? null,
          warrantyNotes: data.warrantyNotes ?? '',
          attachments: data.attachments ?? [],
          notificationIds: data.notificationIds ?? [],
          locationId: data.locationId ?? null,
          bookingStatus: data.bookingStatus ?? null,
          createdAt: tsToISO(data.createdAt) ?? new Date().toISOString(),
          updatedAt: tsToISO(data.updatedAt) ?? new Date().toISOString(),
        };
      });
      // Sort ascending by next service date (earliest due first).
      items.sort((a, b) => a.nextServiceDate.localeCompare(b.nextServiceDate));
      onChange(items);
    },
    onError,
  );
}

export async function createMaintenanceItem(input: CreateMaintenanceInput): Promise<string> {
  const baseDate = input.lastServiceDate ?? new Date();
  const nextServiceDate = calculateNextServiceDate(
    baseDate,
    input.frequency,
    input.customFrequencyDays,
  );

  const docRef = await addDoc(collection(db, COLLECTION), {
    userId: input.userId,
    name: input.name,
    category: input.category,
    frequency: input.frequency,
    customFrequencyDays: input.customFrequencyDays ?? null,
    lastServiceDate: input.lastServiceDate ? Timestamp.fromDate(input.lastServiceDate) : null,
    nextServiceDate: Timestamp.fromDate(nextServiceDate),
    notes: input.notes ?? '',
    brandModel: input.brandModel ?? '',
    serialNumber: input.serialNumber ?? '',
    warrantyExpiry: input.warrantyExpiry ?? null,
    warrantyNotes: input.warrantyNotes ?? '',
    attachments: input.attachments ?? [],
    notificationIds: [],
    locationId: input.locationId ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Schedule local reminders, then store their ids so they can be cancelled
  // later. This must never block or fail the actual save, so it's wrapped and
  // any error is swallowed (e.g. notifications unavailable on web).
  try {
    const notificationIds = await scheduleMaintenanceReminders(
      docRef.id,
      input.name,
      nextServiceDate,
    );
    if (notificationIds.length > 0) {
      await updateDoc(doc(db, COLLECTION, docRef.id), { notificationIds });
    }
  } catch (e) {
    console.log('Reminder scheduling skipped:', e);
  }

  return docRef.id;
}

export async function updateMaintenanceItem(
  id: string,
  updates: Partial<CreateMaintenanceInput>,
  existingNotificationIds: string[] = [],
): Promise<void> {
  const payload: UpdateData<DocumentData> = { updatedAt: serverTimestamp() };

  for (const field of [
    'brandModel',
    'serialNumber',
    'warrantyExpiry',
    'warrantyNotes',
    'attachments',
  ] as const) {
    if (updates[field] !== undefined) payload[field] = updates[field];
  }
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.locationId !== undefined) payload.locationId = updates.locationId;
  if ((updates as any).bookingStatus !== undefined)
    payload.bookingStatus = (updates as any).bookingStatus;
  if (updates.frequency !== undefined) payload.frequency = updates.frequency;
  if (updates.customFrequencyDays !== undefined)
    payload.customFrequencyDays = updates.customFrequencyDays;
  if (updates.lastServiceDate !== undefined) {
    payload.lastServiceDate = updates.lastServiceDate
      ? Timestamp.fromDate(updates.lastServiceDate)
      : null;
  }

  // If frequency, custom days, or last service date changed, recompute next date.
  let nextServiceDate: Date | null = null;
  if (
    updates.frequency !== undefined ||
    updates.customFrequencyDays !== undefined ||
    updates.lastServiceDate !== undefined
  ) {
    const baseDate = updates.lastServiceDate ?? new Date();
    const frequency = updates.frequency ?? 'monthly';
    nextServiceDate = calculateNextServiceDate(baseDate, frequency, updates.customFrequencyDays);
    payload.nextServiceDate = Timestamp.fromDate(nextServiceDate);
  }

  // Write to Firestore FIRST so the edit always saves.
  await updateDoc(doc(db, COLLECTION, id), payload);

  // Reschedule reminders only if the due date changed — best effort, never blocks.
  if (nextServiceDate) {
    try {
      await cancelMaintenanceReminders(existingNotificationIds);
      const newIds = await scheduleMaintenanceReminders(
        id,
        updates.name ?? 'Maintenance task',
        nextServiceDate,
      );
      if (newIds.length > 0) {
        await updateDoc(doc(db, COLLECTION, id), { notificationIds: newIds });
      }
    } catch (e) {
      console.log('Reminder reschedule skipped:', e);
    }
  }
}

/**
 * Marks an item as completed on a given date (defaults to today), logs it to
 * history, and rolls the next service date forward based on its frequency.
 */
export async function markMaintenanceCompleted(
  id: string,
  name: string,
  frequency: ServiceFrequency,
  customFrequencyDays: number | null | undefined,
  existingNotificationIds: string[] = [],
  serviceDate: Date = new Date(),
  /** Who performed this visit, when a provider did it. Enables per-visit reviews. */
  provider?: { id: string; name: string } | null,
): Promise<void> {
  const completed = serviceDate;
  const nextServiceDate = calculateNextServiceDate(completed, frequency, customFrequencyDays);

  // Do the Firestore writes FIRST so they always succeed, even if notification
  // scheduling later hangs or fails (e.g. on web).
  await updateDoc(doc(db, COLLECTION, id), {
    lastServiceDate: Timestamp.fromDate(completed),
    nextServiceDate: Timestamp.fromDate(nextServiceDate),
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'maintenanceHistory'), {
    maintenanceItemId: id,
    maintenanceItemName: name,
    // Stored so security rules can authorise list queries directly. Rules
    // can't call get() on a collection query, so ownership must live here.
    userId: auth.currentUser?.uid ?? null,
    completedDate: Timestamp.fromDate(completed),
    // Recording the provider lets each individual visit be reviewed later.
    providerId: provider?.id ?? null,
    providerName: provider?.name ?? null,
    createdAt: serverTimestamp(),
  });

  // Reschedule reminders — best effort, never blocks the completion.
  try {
    await cancelMaintenanceReminders(existingNotificationIds);
    const newIds = await scheduleMaintenanceReminders(id, name, nextServiceDate);
    if (newIds.length > 0) {
      await updateDoc(doc(db, COLLECTION, id), { notificationIds: newIds });
    }
  } catch (e) {
    console.log('Reminder reschedule skipped:', e);
  }
}

export async function deleteMaintenanceItem(
  id: string,
  notificationIds: string[] = [],
): Promise<void> {
  // Delete from Firestore FIRST so it always succeeds; cancelling reminders
  // is best-effort and must not block the delete (it can hang on web).
  await deleteDoc(doc(db, COLLECTION, id));
  try {
    await cancelMaintenanceReminders(notificationIds);
  } catch (e) {
    console.log('Reminder cancel skipped:', e);
  }
}

/**
 * Subscribes to the completion history for a single maintenance item,
 * most recent first.
 */
export function subscribeToHistory(
  maintenanceItemId: string,
  onChange: (entries: { id: string; completedDate: string }[]) => void,
): () => void {
  // Query by maintenanceItemId only (no orderBy) so this needs no composite
  // index. We sort newest-first in JS below.
  const q = query(
    collection(db, 'maintenanceHistory'),
    where('maintenanceItemId', '==', maintenanceItemId),
  );

  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map((d) => ({
      id: d.id,
      completedDate: tsToISO(d.data().completedDate) ?? new Date().toISOString(),
    }));
    // Most recent completion first.
    entries.sort((a, b) => b.completedDate.localeCompare(a.completedDate));
    onChange(entries);
  });
}

/**
 * A single completed service visit, used to build the Serviced log. Each entry
 * is one visit, so a monthly task produces one reviewable entry per month.
 */
export interface ServiceLogEntry {
  jobId?: string;
  jobType?: 'booking' | 'request';
  id: string;
  maintenanceItemId: string;
  maintenanceItemName: string;
  completedDate: string;
  providerId: string | null;
  providerName: string | null;
}

/**
 * Fetches every completed visit across all of a user's maintenance items,
 * newest first. Firestore can't join, so we read the user's items first and
 * then pull the history belonging to them.
 */
export async function fetchServiceLog(userId: string): Promise<ServiceLogEntry[]> {
  const items = await fetchMaintenanceItems(userId);
  const nameById = new Map(items.map((i) => [i.id, i.name]));
  const ownIds = new Set(items.map((i) => i.id));

  const entries: ServiceLogEntry[] = [];

  // Preferred path: entries tagged with the owner, which rules can authorise.
  try {
    const q = query(collection(db, 'maintenanceHistory'), where('userId', '==', userId));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const data = d.data();
      entries.push({
        id: d.id,
        jobId: data.jobId ?? data.bookingId ?? undefined,
        jobType: data.jobType ?? (data.bookingId ? 'booking' : 'request'),
        maintenanceItemId: data.maintenanceItemId,
        maintenanceItemName:
          data.maintenanceItemName ?? nameById.get(data.maintenanceItemId) ?? 'Service',
        completedDate: tsToISO(data.completedDate) ?? new Date().toISOString(),
        providerId: data.providerId ?? null,
        providerName: data.providerName ?? null,
      });
    });
  } catch (e) {
    console.log('Service log query failed:', e);
  }

  // Entries written before userId was recorded don't match the query above.
  // Fetch them per item, and stamp the owner on as we go so this repair only
  // has to happen once per entry.
  const seen = new Set(entries.map((e) => e.id));
  for (const item of items) {
    try {
      const q = query(
        collection(db, 'maintenanceHistory'),
        where('maintenanceItemId', '==', item.id),
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (seen.has(d.id)) continue;
        const data = d.data();
        if (!ownIds.has(data.maintenanceItemId)) continue;

        seen.add(d.id);
        entries.push({
          id: d.id,
          jobId: data.jobId ?? data.bookingId ?? undefined,
          jobType: data.jobType ?? (data.bookingId ? 'booking' : 'request'),
          maintenanceItemId: data.maintenanceItemId,
          maintenanceItemName: data.maintenanceItemName ?? item.name,
          completedDate: tsToISO(data.completedDate) ?? new Date().toISOString(),
          providerId: data.providerId ?? null,
          providerName: data.providerName ?? null,
        });

        // Backfill so the fast, rule-friendly query finds it next time.
        if (!data.userId) {
          updateDoc(doc(db, 'maintenanceHistory', d.id), {
            userId,
            maintenanceItemName: data.maintenanceItemName ?? item.name,
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.log('Could not read history for item', item.id, e);
    }
  }

  entries.sort((a, b) => b.completedDate.localeCompare(a.completedDate));
  return entries;
}

function tsToISO(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return null;
}
