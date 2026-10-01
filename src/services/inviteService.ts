// src/services/inviteService.ts
//
// Invite-only registration for service providers.
//
// An admin creates an invite; its document ID is a long random token that goes
// into the signup link. The provider opens the link, and their account is
// created in the same transaction that marks the invite used — so an invite
// can't be spent without an account, and a provider account can't exist
// without spending one. The Firestore rules enforce all of this; the checks
// here only exist to give people a clear message before they hit the rules.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '@/config/firebase';

const INVITES = 'providerInvites';

/** Used to build links when there's no browser location (e.g. native). */
const DEFAULT_ORIGIN = 'https://deemm.app';
export const INVITE_PATH = 'provider/signup';

export type InviteStatus = 'valid' | 'used' | 'expired' | 'revoked' | 'invalid';

export interface ProviderInvite {
  token: string;
  email: string | null;
  note: string;
  expiresAt: string;
  used: boolean;
  usedBy: string | null;
  usedAt: string | null;
  revoked: boolean;
  createdAt: string;
}

function toISO(v: unknown): string | null {
  return v instanceof Timestamp ? v.toDate().toISOString() : null;
}

function mapInvite(token: string, d: any): ProviderInvite {
  return {
    token,
    email: d.email ?? null,
    note: d.note ?? '',
    expiresAt: toISO(d.expiresAt) ?? new Date(0).toISOString(),
    used: d.used === true,
    usedBy: d.usedBy ?? null,
    usedAt: toISO(d.usedAt),
    revoked: d.revoked === true,
    createdAt: toISO(d.createdAt) ?? new Date().toISOString(),
  };
}

/** Where an invite stands. Mirrors the Firestore rule, for clear messaging. */
export function inviteStatus(inv: ProviderInvite | null): InviteStatus {
  if (!inv) return 'invalid';
  if (inv.used) return 'used';
  if (inv.revoked) return 'revoked';
  if (new Date(inv.expiresAt).getTime() <= Date.now()) return 'expired';
  return 'valid';
}

/**
 * 32 random bytes as hex. Deliberately refuses to fall back to Math.random:
 * a guessable token would let anyone register as a provider.
 */
function newToken(): string {
  const cryptoObj: Crypto | undefined = (globalThis as any).crypto;
  if (!cryptoObj?.getRandomValues) {
    throw new Error('SECURE_RANDOM_UNAVAILABLE');
  }
  const bytes = new Uint8Array(32);
  cryptoObj.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function inviteLink(token: string): string {
  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : DEFAULT_ORIGIN;
  return `${origin}/${INVITE_PATH}?invite=${token}`;
}

/**
 * If the app was opened on the invitation page, returns the token from the
 * link ('' when the link has no token). Returns null otherwise. Web only —
 * invitation links are ordinary https links that open in the browser.
 */
export const PROVIDER_LOGIN_PATH = 'provider/login';

/**
 * Which staff sign-in page the app was opened on, if any. Web only — these are
 * ordinary links, kept out of the public UI on purpose.
 */
export function readStaffLoginFromUrl(): 'provider' | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === `/${PROVIDER_LOGIN_PATH}`) return 'provider';
  return null;
}

export function readInviteFromUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path !== `/${INVITE_PATH}`) return null;
  return new URLSearchParams(window.location.search).get('invite') ?? '';
}

export async function createInvite(params: {
  adminUid: string;
  email?: string;
  note?: string;
  validDays: number;
}): Promise<ProviderInvite> {
  const token = newToken();
  const expires = new Date(Date.now() + params.validDays * 24 * 60 * 60 * 1000);
  const email = params.email?.trim().toLowerCase() || null;
  await setDoc(doc(db, INVITES, token), {
    email,
    note: params.note?.trim() ?? '',
    expiresAt: Timestamp.fromDate(expires),
    used: false,
    revoked: false,
    createdBy: params.adminUid,
    createdAt: serverTimestamp(),
  });
  return mapInvite(token, {
    email,
    note: params.note?.trim() ?? '',
    expiresAt: Timestamp.fromDate(expires),
    used: false,
    revoked: false,
    createdAt: Timestamp.now(),
  });
}

export async function listInvites(): Promise<ProviderInvite[]> {
  const snap = await getDocs(collection(db, INVITES));
  return snap.docs
    .map((d) => mapInvite(d.id, d.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function revokeInvite(token: string): Promise<void> {
  await updateDoc(doc(db, INVITES, token), { revoked: true, revokedAt: serverTimestamp() });
}

/** Looks an invite up by its token. Null if there's no such invite. */
export async function getInvite(token: string): Promise<ProviderInvite | null> {
  if (!token || token.length < 32) return null;
  try {
    const snap = await getDoc(doc(db, INVITES, token));
    return snap.exists() ? mapInvite(snap.id, snap.data()) : null;
  } catch {
    return null;
  }
}

/**
 * Creates the provider's account records and spends the invite, atomically.
 * The caller must already be signed in as the new account (uid). Throws
 * INVITE_<STATUS> if the invite stopped being valid in the meantime.
 */
export async function redeemInvite(params: {
  token: string;
  uid: string;
  email: string;
  businessName: string;
  appliances: string[];
  address: string;
}): Promise<void> {
  await runTransaction(db, async (tx) => {
    const inviteRef = doc(db, INVITES, params.token);
    const snap = await tx.get(inviteRef);
    const invite = snap.exists() ? mapInvite(snap.id, snap.data()) : null;
    const status = inviteStatus(invite);
    if (status !== 'valid') throw new Error(`INVITE_${status.toUpperCase()}`);
    if (invite!.email && invite!.email !== params.email.trim().toLowerCase()) {
      throw new Error('INVITE_EMAIL_MISMATCH');
    }

    tx.set(doc(db, 'users', params.uid), {
      uid: params.uid,
      role: 'provider',
      name: params.businessName,
      email: params.email.trim().toLowerCase(),
      inviteId: params.token,
      createdAt: serverTimestamp(),
    });
    tx.set(doc(db, 'providers', params.uid), {
      uid: params.uid,
      name: params.businessName,
      appliances: params.appliances,
      address: params.address.trim(),
      serviceAreas: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(inviteRef, {
      used: true,
      usedBy: params.uid,
      usedAt: serverTimestamp(),
    });
  });
}
