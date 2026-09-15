// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
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
  saveProviderServiceAreas,
  saveHomeownerAreas,
  saveSavedLocations,
} from '@/services/roleService';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { UserRole, EmployeePrivilege } from '@/types';

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  roleLoading: boolean;
  initializing: boolean;
  // Employee-specific context (null for non-employees).
  privilege: EmployeePrivilege | null;
  employerId: string | null;
  companyName: string | null;
  login: (email: string, password: string, selectedRole: UserRole) => Promise<void>;
  loginWithGoogle: (selectedRole: UserRole) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    selectedRole: UserRole,
    areas?: string[],
    coords?: { lat: number; lng: number } | null
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Load the stored role whenever auth state resolves (login, refresh…).
        setRoleLoading(true);
        let stored = await getUserRole(firebaseUser.uid);
        // A user arriving back from a Google *redirect* has no role yet (the
        // in-app selection was lost when the page navigated away). Give them
        // the default so they land somewhere sensible; they can change it later.
        if (!stored) {
          await saveUserRole(firebaseUser.uid, 'homeowner', firebaseUser.displayName ?? '');
          stored = 'homeowner';
        }
        setRole(stored);
        if (stored === 'employee') await loadEmployeeContext(firebaseUser.uid);
        setRoleLoading(false);
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
      privilege,
      employerId,
      companyName,
      login: async (email, password, selectedRole) => {
        const loggedIn = await loginUser(email, password);
        // Trust the stored role if present; otherwise fall back to the choice
        // made on the login screen. We never overwrite an existing stored role
        // with the login-screen selection — the stored one is authoritative.
        const stored = await getUserRole(loggedIn.uid);
        if (stored) {
          setRole(stored);
          if (stored === 'employee') await loadEmployeeContext(loggedIn.uid);
        } else {
          await saveUserRole(loggedIn.uid, selectedRole, loggedIn.displayName ?? '');
          setRole(selectedRole);
        }
      },
      loginWithGoogle: async (selectedRole) => {
        const signedIn = await signInWithGoogle();
        // Same role rule as email login: an existing stored role wins; a
        // brand-new Google account gets the role picked on the auth screen.
        const stored = await getUserRole(signedIn.uid);
        if (stored) {
          setRole(stored);
          if (stored === 'employee') await loadEmployeeContext(signedIn.uid);
        } else {
          await saveUserRole(signedIn.uid, selectedRole, signedIn.displayName ?? '');
          setRole(selectedRole);
        }
      },
      register: async (name, email, password, selectedRole, areas = [], coords = null) => {
        const created = await registerUser(name, email, password);
        await saveUserRole(created.uid, selectedRole, name);

        // Both areas and the map pin are optional at signup — whatever the user
        // gave us is stored, and anything missing can be added later from their
        // profile.
        if (selectedRole === 'provider') {
          if (areas.length > 0 || coords) {
            await saveProviderServiceAreas(
              created.uid,
              '',
              areas,
              coords ? { lat: coords.lat, lng: coords.lng } : null
            );
          }
        } else {
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
        setRole(selectedRole);
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
    [user, role, roleLoading, initializing, privilege, employerId, companyName]
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
