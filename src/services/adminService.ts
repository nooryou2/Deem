// src/services/adminService.ts
//
// Reads across every user's data for the admin console. All of this is
// read-only apart from template management and role changes.

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  AdminUser,
  AdminTemplate,
  MaintenanceItem,
  MaintenanceCategory,
  ServiceFrequency,
} from '@/types';
import { getMaintenanceStatus } from '@/utils/dateCalculations';

const USERS = 'users';
const ITEMS = 'maintenanceItems';
const TEMPLATES = 'adminTemplates';

function tsToISO(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

/**
 * Every user, with how many maintenance items each one has. Item counts come
 * from one pass over the items collection rather than a query per user.
 */
export async function fetchAllUsers(): Promise<AdminUser[]> {
  const [userSnap, itemSnap] = await Promise.all([
    getDocs(collection(db, USERS)),
    getDocs(collection(db, ITEMS)),
  ]);

  const counts = new Map<string, number>();
  itemSnap.docs.forEach((d) => {
    const uid = d.data().userId;
    if (uid) counts.set(uid, (counts.get(uid) ?? 0) + 1);
  });

  const users = userSnap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      name: data.name ?? data.displayName ?? 'Unnamed',
      email: data.email ?? '',
      role: data.role ?? 'homeowner',
      itemCount: counts.get(d.id) ?? 0,
      createdAt: tsToISO(data.createdAt),
    } as AdminUser;
  });

  users.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return users;
}

/** Maintenance items belonging to one user. */
export async function fetchItemsForUser(userId: string): Promise<MaintenanceItem[]> {
  const snap = await getDocs(query(collection(db, ITEMS), where('userId', '==', userId)));
  return snap.docs.map((d) => mapItem(d.id, d.data()));
}

/** Every maintenance item across all users, newest due first. */
export async function fetchAllItems(): Promise<(MaintenanceItem & { ownerName: string })[]> {
  const [itemSnap, userSnap] = await Promise.all([
    getDocs(collection(db, ITEMS)),
    getDocs(collection(db, USERS)),
  ]);

  const names = new Map<string, string>();
  userSnap.docs.forEach((d) => names.set(d.id, d.data().name ?? 'Unnamed'));

  const items = itemSnap.docs.map((d) => ({
    ...mapItem(d.id, d.data()),
    ownerName: names.get(d.data().userId) ?? 'Unknown',
  }));

  items.sort((a, b) => a.nextServiceDate.localeCompare(b.nextServiceDate));
  return items;
}

/** Headline counts for the admin dashboard. */
export async function fetchAdminStats() {
  const [users, items] = await Promise.all([fetchAllUsers(), fetchAllItems()]);

  let overdue = 0;
  let dueSoon = 0;
  let upcoming = 0;
  let completed = 0;

  for (const item of items) {
    const status = getMaintenanceStatus(item.nextServiceDate);
    if (status === 'overdue') overdue++;
    else if (status === 'due_soon') dueSoon++;
    else upcoming++;
    if (item.lastServiceDate) completed++;
  }

  return {
    totalUsers: users.length,
    totalItems: items.length,
    overdue,
    dueSoon,
    upcoming,
    completed,
    // The soonest problems, for the "Needs Attention" list.
    needsAttention: items
      .filter((i) => {
        const s = getMaintenanceStatus(i.nextServiceDate);
        return s === 'overdue' || s === 'due_soon';
      })
      .slice(0, 20),
  };
}

// ---------------- Templates ----------------

export async function fetchTemplates(): Promise<AdminTemplate[]> {
  const snap = await getDocs(collection(db, TEMPLATES));
  const list = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name ?? '',
      category: data.category ?? 'custom',
      defaultFrequency: data.defaultFrequency ?? 'yearly',
      active: data.active !== false,
      createdAt: tsToISO(data.createdAt),
    } as AdminTemplate;
  });
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

export async function createTemplate(input: {
  name: string;
  category: MaintenanceCategory;
  defaultFrequency: ServiceFrequency;
}): Promise<void> {
  await addDoc(collection(db, TEMPLATES), {
    ...input,
    active: true,
    createdAt: serverTimestamp(),
  });
}

export async function updateTemplate(
  id: string,
  updates: Partial<Omit<AdminTemplate, 'id' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, TEMPLATES, id), updates);
}

export async function deleteTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, TEMPLATES, id));
}

// ---------------- Users ----------------

/** Changes a user's role. Used sparingly — it grants or removes access. */
export async function setUserRole(uid: string, role: string): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { role });
}

export async function fetchUser(uid: string): Promise<AdminUser | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  const items = await fetchItemsForUser(uid);
  return {
    uid,
    name: data.name ?? 'Unnamed',
    email: data.email ?? '',
    role: data.role ?? 'homeowner',
    itemCount: items.length,
    createdAt: tsToISO(data.createdAt),
  };
}

function mapItem(id: string, data: any): MaintenanceItem {
  return {
    id,
    userId: data.userId,
    name: data.name ?? 'Untitled',
    category: data.category ?? 'custom',
    frequency: data.frequency ?? 'yearly',
    customFrequencyDays: data.customFrequencyDays ?? null,
    lastServiceDate: data.lastServiceDate ? tsToISO(data.lastServiceDate) : null,
    nextServiceDate: tsToISO(data.nextServiceDate),
    notes: data.notes ?? '',
    notificationIds: data.notificationIds ?? [],
    locationId: data.locationId ?? null,
    bookingStatus: data.bookingStatus ?? null,
    createdAt: tsToISO(data.createdAt),
    updatedAt: tsToISO(data.updatedAt),
  };
}
