// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { onAuthStateChanged, getRedirectResult, deleteUser, type User } from 'firebase/auth';
import { auth } from '@/config/firebase';
import {
  loginUser,
  signInWithGoogle,
  registerUser,
  logoutUser,
  resetPassword as resetPasswordService,
} from '@/services/authService';
import {
  saveUserRole,
  getUserRole,
  saveHomeownerAreas,
  saveSavedLocations,
} from '@/services/roleService';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { UserRole, EmployeePrivilege } from '@/types';
import { redeemInvite } from '@/services/inviteService';

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  roleLoading: boolean;
  initializing: boolean;
  // Employee-specific context (null for non-employees).
  privilege: EmployeePrivilege | null;
  employerId: string | null;
  companyName: string | null;
  /**
   * `allowed` restricts which roles may sign in here, keeping the homeowner,
   * provider and admin entrances separate. An account with the wrong role is
   * signed straight back out and ROLE_NOT_ALLOWED is thrown.
   */
  login: (email: string, password: string, allowed?: UserRole[]) => Promise<void>;
  loginWithGoogle: (allowed?: UserRole[]) => Promise<void>;
  /** Public signup. Always creates a homeowner. */
  register: (
    name: string,
    email: string,
    password: string,
    areas?: string[],
    coords?: { lat: number; lng: number } | null
  ) => Promise<void>;
  /** True while an invited provider's account is being created. */
  providerSignupActive: boolean;
  /** Invite-only provider signup. The invite token is required. */
  registerProvider: (
    token: string,
    form: {
      businessName: string;
      email: string;
      password: string;
      appliances: string[];
      address: string;
    }
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ALLOWED_ROLES_KEY = 'deem.auth.allowedRoles';
export const AUTH_ERROR_KEY = 'deem.auth.error';

function safeSessionGet(key: string): string | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
export function safeSessionSet(key: string, value: string): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, value);
  } catch {
    // Storage unavailable; the message simply won't persist across the redirect.
  }
}
export function safeSessionRemove(key: string): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
  } catch {
    // Nothing to clean up.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Set while an invited provider's account is being created. Creating the
  // Firebase account fires the auth listener immediately — before the provider
  // records exist — and the listener would otherwise default the new account
  // to homeowner. The rules then (correctly) refuse to change that role, which
  // would leave every invited provider stuck as a homeowner.
  const providerSignupInFlight = useRef(false);
  // Mirrors the ref as state so the navigator can keep the sign-up page
  // mounted (and its form and any error visible) for the whole attempt.
  const [providerSignupActive, setProviderSignupActive] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [privilege, setPrivilege] = useState<EmployeePrivilege | null>(null);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);

  // Loads the extra employee fields (privilege, employer) from the user doc.
  async function loadEmployeeContext(uid: string) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        setPrivilege(data.privilege === 'manager' ? 'manager' : data.privilege === 'worker' ? 'worker' : null);
        const provId = data.providerId ?? null;
        setEmployerId(provId);
        // Prefer the stored provider name; if missing (older accounts), look it
        // up from the providers directory so the company name still shows.
        if (data.providerName) {
          setCompanyName(data.providerName);
        } else if (provId) {
          try {
            const provSnap = await getDoc(doc(db, 'providers', provId));
            setCompanyName(provSnap.exists() ? provSnap.data().name ?? null : null);
          } catch {
            setCompanyName(null);
          }
        }
      }
    } catch {
      setPrivilege(null);
      setEmployerId(null);
      setCompanyName(null);
    }
  }

  // Completes a redirect sign-in that was already in flight before the app
  // switched to popup-only. Harmless when there's nothing pending.
  useEffect(() => {
    // Web only: getRedirectResult doesn't exist in Firebase's React Native
    // build, and calling it there crashes the app on startup.
    if (Platform.OS !== 'web' || typeof getRedirectResult !== 'function') return;
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result?.user) return;
        // A redirect leaves the page, so the entrance's role restriction is
        // stashed before leaving and enforced here on the way back.
        const raw = safeSessionGet(ALLOWED_ROLES_KEY);
        safeSessionRemove(ALLOWED_ROLES_KEY);
        if (!raw) return;
        const allowed = JSON.parse(raw) as UserRole[];
        const stored = (await getUserRole(result.user.uid)) ?? 'homeowner';
        if (!allowed.includes(stored)) {
          await logoutUser();
          safeSessionSet(
            AUTH_ERROR_KEY,
            stored === 'homeowner'
              ? 'This is a homeowner account. Please sign in on the main DEEM page.'
              : stored === 'admin'
                ? 'This is an admin account. Please use the admin sign-in page.'
                : 'This is a service provider account. Please use the service provider sign-in page.'
          );
        }
      })
      .catch((e) => console.log('No pending redirect:', e?.code));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Load the stored role whenever auth state resolves (login, refresh…).
        setRoleLoading(true);
        // Read the flag *before* awaiting, so a signup that finishes while the
        // role is loading can't slip through and get defaulted to homeowner.
        const deferToProviderSignup = providerSignupInFlight.current;
        let stored = await getUserRole(firebaseUser.uid);
        if (!stored && deferToProviderSignup) {
          // registerProvider is creating this account's role and will set it.
        } else {
          // A brand-new account with no role (e.g. first Google sign-in) is a
          // homeowner: that's the only role the public app can create.
          if (!stored) {
            await saveUserRole(firebaseUser.uid, 'homeowner', firebaseUser.displayName ?? '');
            stored = 'homeowner';
          }
          setRole(stored);
          if (stored === 'employee') await loadEmployeeContext(firebaseUser.uid);
          setRoleLoading(false);
        }
      } else {
        setRole(null);
        setPrivilege(null);
        setEmployerId(null);
        setCompanyName(null);
      }
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      roleLoading,
      initializing,
      providerSignupActive,
      privilege,
      employerId,
      companyName,
      login: async (email, password, allowed) => {
        const loggedIn = await loginUser(email, password);
        // The stored role is authoritative. An account with none is treated as
        // a homeowner — the public app can't create any other role.
        const stored = (await getUserRole(loggedIn.uid)) ?? 'homeowner';

        if (allowed && !allowed.includes(stored)) {
          // Wrong entrance: don't leave them signed in.
          await logoutUser();
          const err = new Error('ROLE_NOT_ALLOWED');
          (err as any).actualRole = stored;
          throw err;
        }

        if (stored === 'homeowner' && !(await getUserRole(loggedIn.uid))) {
          await saveUserRole(loggedIn.uid, 'homeowner', loggedIn.displayName ?? '');
        }
        setRole(stored);
        if (stored === 'employee') await loadEmployeeContext(loggedIn.uid);
      },
      loginWithGoogle: async (allowed) => {
        // Stashed before signing in: on mobile this may redirect away and come
        // back on a fresh page load.
        if (allowed) safeSessionSet(ALLOWED_ROLES_KEY, JSON.stringify(allowed));
        let signedIn;
        try {
          signedIn = await signInWithGoogle();
        } catch (e: any) {
          if (e?.message !== 'REDIRECTING') safeSessionRemove(ALLOWED_ROLES_KEY);
          throw e;
        }
        safeSessionRemove(ALLOWED_ROLES_KEY);
        // Same rule as email login: a stored role wins; a new account is a
        // homeowner. Providers can't sign up with Google — only by invite.
        const stored = await getUserRole(signedIn.uid);
        if (stored && allowed && !allowed.includes(stored)) {
          await logoutUser();
          const err = new Error('ROLE_NOT_ALLOWED');
          (err as any).actualRole = stored;
          throw err;
        }
        if (stored) {
          setRole(stored);
          if (stored === 'employee') await loadEmployeeContext(signedIn.uid);
        } else {
          await saveUserRole(signedIn.uid, 'homeowner', signedIn.displayName ?? '');
          setRole('homeowner');
        }
      },
      register: async (name, email, password, areas = [], coords = null) => {
        const created = await registerUser(name, email, password);
        await saveUserRole(created.uid, 'homeowner', name);

        // Both areas and the map pin are optional at signup — whatever the user
        // gave us is stored, and anything missing can be added later from their
        // profile.
        {
          if (areas.length > 0) {
            await saveHomeownerAreas(created.uid, areas);
          }
          // A pinned home becomes their first saved location, so booking works
          // straight away without a detour through the profile.
          if (coords) {
            await saveSavedLocations(created.uid, [
              {
                id: `loc_${Date.now()}`,
                label: 'My Home',
                lat: coords.lat,
                lng: coords.lng,
                address: '',
                area: areas[0] ?? '',
                isDefault: true,
              },
            ]);
          }
        }
        setRole('homeowner');
      },
      registerProvider: async (token, form) => {
        providerSignupInFlight.current = true;
        setProviderSignupActive(true);
        setRoleLoading(true);
        let created: User | null = null;
        try {
          created = await registerUser(form.businessName, form.email, form.password);
          await redeemInvite({
            token,
            uid: created.uid,
            email: form.email,
            businessName: form.businessName,
            appliances: form.appliances,
            address: form.address,
          });
          setRole('provider');
        } catch (e) {
          // If the invite couldn't be redeemed, remove the half-made login so
          // it can't later sign in and be treated as something it isn't.
          if (created) {
            try {
              await deleteUser(created);
            } catch {
              // Best effort; without a provider record it can only ever be a
              // homeowner, never a provider.
            }
          }
          throw e;
        } finally {
          providerSignupInFlight.current = false;
          setProviderSignupActive(false);
          setRoleLoading(false);
        }
      },
      logout: async () => {
        await logoutUser();
        setRole(null);
        setPrivilege(null);
        setEmployerId(null);
        setCompanyName(null);
      },
      resetPassword: async (email) => {
        await resetPasswordService(email);
      },
    }),
    [user, role, roleLoading, initializing, providerSignupActive, privilege, employerId, companyName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
