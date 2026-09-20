// src/config/firebase.ts
//
// Fill these in with your own Firebase project credentials.
// Firebase Console -> Project Settings -> General -> Your apps -> SDK setup and configuration
//
// IMPORTANT: For a production app, move these values into environment variables
// (e.g. using `expo-constants` + `app.config.js` + a `.env` file that is git-ignored)
// instead of committing real keys to source control.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp,getApps,initializeApp } from 'firebase/app';
import {
browserLocalPersistence,
connectAuthEmulator,
getAuth,
// @ts-ignore - getReactNativePersistence exists at runtime but is missing from types
getReactNativePersistence,
initializeAuth,
type Auth,
} from 'firebase/auth';
import {
connectFirestoreEmulator,
getFirestore,
initializeFirestore,
type Firestore,
} from 'firebase/firestore';
import { connectStorageEmulator,getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const useEmulators = __DEV__ && process.env.EXPO_PUBLIC_USE_EMULATORS === 'true';
const firebaseConfig = useEmulators
  ? {
      apiKey: 'demo-key',
      authDomain: 'demo-deem.firebaseapp.com',
      projectId: 'demo-deem',
      storageBucket: 'demo-deem.appspot.com',
      appId: 'demo-deem',
    }
  : {
      apiKey: 'AIzaSyCs3zmjgT_sWjJdLE4Pr3c9t_I8Iwg66CY',
      authDomain: 'sanad-e967c.firebaseapp.com',
      projectId: 'sanad-e967c',
      storageBucket: 'sanad-e967c.firebasestorage.app',
      messagingSenderId: '892846536745',
      appId: '1:892846536745:web:b50459698d2d276f604438',
      measurementId: 'G-DE397ETR0D',
    };

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Persistence differs by platform:
//  - Native (iOS/Android): AsyncStorage so the user stays logged in.
//  - Web (browser): browserLocalPersistence; getReactNativePersistence is not
//    valid on web and will break auth if used there.
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence:
      Platform.OS === 'web' ? browserLocalPersistence : getReactNativePersistence(AsyncStorage),
  });
} catch {
  // initializeAuth throws if it was already called (e.g. fast refresh in dev)
  auth = getAuth(app);
}

// Firestore's default streaming transport gets blocked by many corporate
// proxies/firewalls, leaving writes hanging in an endless retry loop. Forcing
// long-polling replaces streaming with plain HTTP requests that proxies allow.
let db: Firestore;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch (e) {
  console.log('[Firebase] initializeFirestore failed, falling back to getFirestore:', e);
  db = getFirestore(app);
}

if (useEmulators && Platform.OS === 'web') {
  const host = window.location.hostname;
  try {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  } catch {}
  try {
    connectFirestoreEmulator(db, host, 8180);
  } catch {}
  try {
    connectStorageEmulator(getStorage(app), host, 9199);
  } catch {}
}
export { app,auth,db };
