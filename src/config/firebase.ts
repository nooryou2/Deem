// src/config/firebase.ts
//
// Fill these in with your own Firebase project credentials.
// Firebase Console -> Project Settings -> General -> Your apps -> SDK setup and configuration
//
// IMPORTANT: For a production app, move these values into environment variables
// (e.g. using `expo-constants` + `app.config.js` + a `.env` file that is git-ignored)
// instead of committing real keys to source control.

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  // @ts-ignore - getReactNativePersistence exists at runtime but is missing from types
  getReactNativePersistence,
  getAuth,
  browserLocalPersistence,
  type Auth,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
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
      Platform.OS === 'web'
        ? browserLocalPersistence
        : getReactNativePersistence(AsyncStorage),
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
  console.log('[Firebase] Firestore initialized with FORCE LONG POLLING ✅');
} catch (e) {
  console.log('[Firebase] initializeFirestore failed, falling back to getFirestore:', e);
  db = getFirestore(app);
}

export { app, auth, db };