// src/services/roleService.ts
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  UserRole,
  ProviderProfile,
  GeoLocation,
  SavedLocation,
  MAX_SAVED_LOCATIONS,
} from '@/types';

const COLLECTION = 'users';
const PROVIDERS = 'providers';

/**
 * Saves the user's chosen role (and name) to Firestore. Called at registration.
 * If the user is a provider, also writes a public provider profile that
 * homeowners can browse when requesting a service.
 */
export async function saveUserRole(
  uid: string,
  role: UserRole,
  name: string
): Promise<void> {
  await setDoc(
    doc(db, COLLECTION, uid),
    { role, name, updatedAt: serverTimestamp() },
    { merge: true }
  );

  if (role === 'provider') {
    await setDoc(
      doc(db, PROVIDERS, uid),
      { uid, name, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }
}

/**
 * Reads the user's role. Returns null if no profile document exists yet.
 */
export async function getUserRole(uid: string): Promise<UserRole | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    if (!snap.exists()) return null;
    const role = snap.data().role;
    return role === 'provider' || role === 'homeowner' || role === 'employee'
      ? role
      : null;
  } catch (e) {
    console.log('getUserRole failed:', e);
    return null;
  }
}

/**
 * Lists all registered service providers for the homeowner to choose from.
 */
export async function listProviders(): Promise<ProviderProfile[]> {
  try {
    const snap = await getDocs(collection(db, PROVIDERS));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: data.uid ?? d.id,
        name: data.name ?? 'Service Provider',
        category: data.category,
        description: data.description,
        appliances: data.appliances ?? [],
        otherAppliance: data.otherAppliance ?? '',
        address: data.address ?? '',
        serviceAreas: data.serviceAreas ?? [],
        location: data.location ?? null,
        rating: data.rating ?? null,
      };
    });
  } catch (e) {
    console.log('listProviders failed:', e);
    return [];
  }
}

/**
 * Saves the appliances a provider fixes (and any custom "other" text) to their
 * public provider profile. Editable from the provider profile screen.
 */
export async function saveProviderAppliances(
  uid: string,
  appliances: string[],
  otherAppliance: string
): Promise<void> {
  await setDoc(
    doc(db, PROVIDERS, uid),
    { uid, appliances, otherAppliance, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Reads a single provider's public profile (used to prefill the edit screen).
 */
export async function getProviderProfile(uid: string): Promise<ProviderProfile | null> {
  try {
    const snap = await getDoc(doc(db, PROVIDERS, uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: data.uid ?? uid,
      name: data.name ?? 'Service Provider',
      appliances: data.appliances ?? [],
      otherAppliance: data.otherAppliance ?? '',
      address: data.address ?? '',
      serviceAreas: data.serviceAreas ?? [],
      location: data.location ?? null,
      rating: data.rating ?? null,
    };
  } catch (e) {
    console.log('getProviderProfile failed:', e);
    return null;
  }
}

/**
 * Saves the provider's base address and the areas they are willing to work in.
 * Homeowners only see providers whose service areas overlap their own area.
 */
export async function saveProviderServiceAreas(
  uid: string,
  address: string,
  serviceAreas: string[],
  location: GeoLocation | null = null
): Promise<void> {
  await setDoc(
    doc(db, PROVIDERS, uid),
    {
      uid,
      address: address.trim(),
      serviceAreas,
      location: location ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Saves the areas a homeowner's properties are in (they may have more than one).
 * Stored on their private user doc.
 */
export async function saveHomeownerAreas(
  uid: string,
  areas: string[]
): Promise<void> {
  await setDoc(
    doc(db, COLLECTION, uid),
    { areas, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Reads the areas a homeowner has registered. Empty means "not set yet", which
 * the matching logic treats as "show everything".
 */
export async function getHomeownerAreas(uid: string): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    if (!snap.exists()) return [];
    const areas = snap.data().areas;
    return Array.isArray(areas) ? areas : [];
  } catch (e) {
    console.log('getHomeownerAreas failed:', e);
    return [];
  }
}

/**
 * Saves the homeowner's pinned delivery-style location (map pin + address).
 */
export async function saveHomeownerLocation(
  uid: string,
  location: GeoLocation
): Promise<void> {
  await setDoc(
    doc(db, COLLECTION, uid),
    { location, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Reads the homeowner's pinned location, or null if they haven't set one.
 */
export async function getHomeownerLocation(uid: string): Promise<GeoLocation | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    if (!snap.exists()) return null;
    return (snap.data().location as GeoLocation) ?? null;
  } catch (e) {
    console.log('getHomeownerLocation failed:', e);
    return null;
  }
}

// ---------------- Saved locations (homeowner, max 5) ----------------

/**
 * Reads the homeowner's saved locations. Falls back to migrating a legacy
 * single `location` field into the new list so older accounts keep their pin.
 */
export async function getSavedLocations(uid: string): Promise<SavedLocation[]> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    if (!snap.exists()) return [];
    const data = snap.data();

    if (Array.isArray(data.savedLocations)) {
      return data.savedLocations as SavedLocation[];
    }

    // Legacy: a single pinned location + areas array.
    if (data.location) {
      const areas: string[] = Array.isArray(data.areas) ? data.areas : [];
      return [
        {
          id: 'legacy',
          label: 'My Home',
          lat: data.location.lat,
          lng: data.location.lng,
          address: data.location.address ?? '',
          area: areas[0] ?? '',
          isDefault: true,
        },
      ];
    }
    return [];
  } catch (e) {
    console.log('getSavedLocations failed:', e);
    return [];
  }
}

/**
 * Writes the full list of saved locations, enforcing the maximum and keeping
 * the `areas` field in sync (it's what provider matching reads).
 */
export async function saveSavedLocations(
  uid: string,
  locations: SavedLocation[]
): Promise<void> {
  const capped = locations.slice(0, MAX_SAVED_LOCATIONS);
  // Every area the homeowner has a property in — used to match providers.
  const areas = Array.from(
    new Set(capped.map((l) => l.area).filter((a): a is string => Boolean(a)))
  );
  await setDoc(
    doc(db, COLLECTION, uid),
    { savedLocations: capped, areas, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Saves the provider's public bio — the short description homeowners read
 * before choosing them.
 */
export async function saveProviderBio(uid: string, bio: string): Promise<void> {
  await setDoc(
    doc(db, PROVIDERS, uid),
    { uid, description: bio.trim(), updatedAt: serverTimestamp() },
    { merge: true }
  );
}
