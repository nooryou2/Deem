// src/services/employeeService.ts
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { createAccountIsolated } from '@/config/secondaryFirebase';
import { Employee, EmployeePrivilege } from '@/types';

const EMPLOYEES = 'employees';
const USERS = 'users';

export interface CreateEmployeeInput {
  name: string;
  email: string;
  password: string;
  privilege: EmployeePrivilege;
  providerId: string;
  providerName: string;
}

/**
 * Creates an employee auth account on an isolated Firebase instance (so the
 * provider stays logged in), then writes the employee profile + role docs.
 */
export async function createEmployee(input: CreateEmployeeInput): Promise<void> {
  const uid = await createAccountIsolated(input.name, input.email, input.password);

  // Employee directory record (owned by the provider).
  await setDoc(doc(db, EMPLOYEES, uid), {
    uid,
    name: input.name.trim(),
    email: input.email.trim(),
    privilege: input.privilege,
    providerId: input.providerId,
    providerName: input.providerName,
    createdAt: serverTimestamp(),
  });

  // Role doc so login routes them to the employee interface.
  await setDoc(doc(db, USERS, uid), {
    role: 'employee',
    name: input.name.trim(),
    providerId: input.providerId,
    providerName: input.providerName,
    privilege: input.privilege,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Lists all employees belonging to a provider.
 */
export async function listEmployees(providerId: string): Promise<Employee[]> {
  const q = query(collection(db, EMPLOYEES), where('providerId', '==', providerId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => mapEmployee(d.data()));
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

/**
 * Reads a single employee's own record (used by the employee interface).
 */
export async function getEmployee(uid: string): Promise<Employee | null> {
  const snap = await getDoc(doc(db, EMPLOYEES, uid));
  if (!snap.exists()) return null;
  return mapEmployee(snap.data());
}

/**
 * Updates an employee's editable info (name + privilege). Email/password are
 * tied to the auth account and can't be changed here without re-auth, so we
 * keep those read-only in the edit UI.
 */
export async function updateEmployee(
  uid: string,
  updates: { name?: string; privilege?: EmployeePrivilege }
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.privilege !== undefined) payload.privilege = updates.privilege;

  await setDoc(doc(db, EMPLOYEES, uid), payload, { merge: true });

  // Keep the role/user doc's mirrored fields in sync.
  const userPayload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (updates.name !== undefined) userPayload.name = updates.name.trim();
  if (updates.privilege !== undefined) userPayload.privilege = updates.privilege;
  await setDoc(doc(db, USERS, uid), userPayload, { merge: true });
}

/**
 * Removes an employee from the provider's team. Note: this deletes the
 * directory + role records so they can no longer be assigned or routed as an
 * employee. The underlying auth account still exists but has no role.
 */
export async function removeEmployee(uid: string): Promise<void> {
  await deleteDoc(doc(db, EMPLOYEES, uid));
  // Clear their role so they can't log into the employee interface anymore.
  await setDoc(doc(db, USERS, uid), { role: 'disabled', updatedAt: serverTimestamp() }, { merge: true });
}

function mapEmployee(data: any): Employee {
  return {
    uid: data.uid,
    name: data.name ?? 'Employee',
    email: data.email ?? '',
    privilege: data.privilege === 'manager' ? 'manager' : 'worker',
    providerId: data.providerId,
    providerName: data.providerName ?? 'Company',
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString(),
  };
}
