// src/services/requestService.ts
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  ServiceRequest,
  ServiceRequestStatus,
  MaintenanceCategory,
} from '@/types';

const COLLECTION = 'serviceRequests';

export interface CreateRequestInput {
  homeownerId: string;
  homeownerName: string;
  providerId: string;
  providerName: string;
  maintenanceItemId: string | null;
  serviceType: string;
  category: MaintenanceCategory;
  notes?: string;
  preferredDate?: Date | null;
  isEmergency?: boolean;
  appliances?: string[];
}

export async function createServiceRequest(input: CreateRequestInput): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    homeownerId: input.homeownerId,
    homeownerName: input.homeownerName,
    providerId: input.providerId,
    providerName: input.providerName,
    maintenanceItemId: input.maintenanceItemId,
    serviceType: input.serviceType,
    category: input.category,
    status: 'pending' as ServiceRequestStatus,
    notes: input.notes ?? '',
    preferredDate: input.preferredDate ? Timestamp.fromDate(input.preferredDate) : null,
    isEmergency: input.isEmergency ?? false,
    appliances: input.appliances ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

async function fetchBy(field: 'homeownerId' | 'providerId', uid: string): Promise<ServiceRequest[]> {
  const q = query(collection(db, COLLECTION), where(field, '==', uid));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => mapRequest(d.id, d.data()));
  // Newest first (sorted in JS to avoid needing a composite index).
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list;
}

export function fetchRequestsForHomeowner(uid: string): Promise<ServiceRequest[]> {
  return fetchBy('homeownerId', uid);
}

export function fetchRequestsForProvider(uid: string): Promise<ServiceRequest[]> {
  return fetchBy('providerId', uid);
}

export async function updateRequestStatus(
  id: string,
  status: ServiceRequestStatus
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status, updatedAt: serverTimestamp() });
}

/**
 * Assigns an employee to a request (used by the provider when accepting).
 */
export async function assignEmployee(
  id: string,
  employeeId: string,
  employeeName: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    assignedEmployeeId: employeeId,
    assignedEmployeeName: employeeName,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Fetches all requests assigned to a specific employee.
 */
export async function fetchRequestsForEmployee(employeeId: string): Promise<ServiceRequest[]> {
  const q = query(collection(db, COLLECTION), where('assignedEmployeeId', '==', employeeId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => mapRequest(d.id, d.data()));
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list;
}

function mapRequest(id: string, data: any): ServiceRequest {
  return {
    id,
    homeownerId: data.homeownerId,
    homeownerName: data.homeownerName ?? 'Homeowner',
    providerId: data.providerId,
    providerName: data.providerName ?? 'Provider',
    maintenanceItemId: data.maintenanceItemId ?? null,
    serviceType: data.serviceType ?? 'Service',
    category: data.category ?? 'custom',
    status: data.status ?? 'pending',
    notes: data.notes ?? '',
    preferredDate: tsToISO(data.preferredDate),
    isEmergency: data.isEmergency ?? false,
    appliances: data.appliances ?? [],
    assignedEmployeeId: data.assignedEmployeeId ?? null,
    assignedEmployeeName: data.assignedEmployeeName ?? null,
    createdAt: tsToISO(data.createdAt) ?? new Date().toISOString(),
    updatedAt: tsToISO(data.updatedAt) ?? new Date().toISOString(),
  };
}

function tsToISO(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return null;
}
