// src/config/secondaryFirebase.ts
//
// Creating a user with createUserWithEmailAndPassword on the primary auth
// instance signs the current user OUT and signs the new user IN. To let a
// provider create employee accounts while STAYING logged in, we create the
// account on a separate, in-memory Firebase app instance, then immediately
// sign out and delete that instance. The provider's main session is untouched.

import { initializeApp, deleteApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';

// Reuse the same config as the primary app.
const firebaseConfig = {
  apiKey: 'AIzaSyCs3zmjgT_sWjJdLE4Pr3c9t_I8Iwg66CY',
  authDomain: 'sanad-e967c.firebaseapp.com',
  projectId: 'sanad-e967c',
  storageBucket: 'sanad-e967c.firebasestorage.app',
  messagingSenderId: '892846536745',
  appId: '1:892846536745:web:b50459698d2d276f604438',
  measurementId: 'G-DE397ETR0D',
};

/**
 * Creates an auth account on an isolated secondary app instance and returns
 * the new user's uid. The provider's primary session is never affected.
 */
export async function createAccountIsolated(
  name: string,
  email: string,
  password: string
): Promise<string> {
  const appName = `secondary-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      email.trim(),
      password
    );
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    const uid = cred.user.uid;
    // Sign the new user out of the secondary instance and tear it down.
    await signOut(secondaryAuth);
    return uid;
  } finally {
    // Always clean up the temporary app instance.
    const existing = getApps().find((a) => a.name === appName);
    if (existing) await deleteApp(existing);
  }
}
