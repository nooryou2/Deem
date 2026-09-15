// src/services/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  browserPopupRedirectResolver,
  type User,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { auth } from '@/config/firebase';

/**
 * Signs in with Google.
 *
 * On web we must pass `browserPopupRedirectResolver` explicitly. Metro (Expo's
 * bundler) resolves `firebase/auth` to Firebase's React Native build even when
 * running in a browser, and that build does not register a popup/redirect
 * resolver by default — without it, signInWithPopup fails with
 * 'auth/argument-error'.
 *
 * If the popup itself is unavailable (blocked, or an embedded webview), we fall
 * back to a full-page redirect, which always works.
 */
export async function signInWithGoogle(): Promise<User> {
  if (Platform.OS !== 'web') {
    throw new Error('GOOGLE_NATIVE_UNSUPPORTED');
  }
  const provider = new GoogleAuthProvider();
  // Always show the account chooser rather than silently reusing a session.
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const credential = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    return credential.user;
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    // Popup couldn't be used — fall back to redirecting the whole page.
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
      // The page navigates away; this line is not reached.
      return Promise.reject(new Error('REDIRECTING'));
    }
    throw err;
  }
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) {
    await updateProfile(credential.user, { displayName: name.trim() });
  }
  return credential.user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Converts Firebase's auth error codes into friendly, specific, user-facing copy.
 *
 * `context` lets the same code produce different wording depending on whether
 * the user was logging in, registering, or resetting a password (e.g. an
 * invalid credential during login vs. registration).
 */
type AuthContext = 'login' | 'register' | 'reset';

export function getAuthErrorMessage(error: unknown, context: AuthContext = 'login'): string {
  const code = (error as { code?: string })?.code ?? '';
  const message = (error as { message?: string })?.message ?? '';

  // Log the full error so the real cause is visible in the console during
  // development — the user-facing string below is intentionally short.
  console.log('[auth error]', { code, message, error });

  // --- Google sign-in specific ---
  if (message === 'GOOGLE_NATIVE_UNSUPPORTED') {
    return 'Google sign-in is currently available on the web version only.';
  }
  if (message === 'REDIRECTING') {
    return ''; // page is navigating to Google; nothing to show
  }
  switch (code) {
    case 'auth/argument-error':
      return 'Google sign-in could not start. Please refresh the page and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Please allow popups and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account with this email already exists using a different sign-in method. Try logging in with your email and password.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled. Please enable Google sign-in in Firebase Console.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorised for sign-in. Add it in Firebase Console → Authentication → Settings → Authorised domains.';
  }

  switch (code) {
    // --- Email problems ---
    case 'auth/invalid-email':
      return 'That email address is not valid. Please check and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in instead.';
    case 'auth/missing-email':
      return 'Please enter your email address.';

    // --- Password problems ---
    case 'auth/weak-password':
      return 'Your password is too weak. Use at least 6 characters.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';

    // --- Account existence ---
    case 'auth/user-not-found':
      return context === 'reset'
        ? 'No account found with this email address.'
        : 'No account found with this email. Please sign up first.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';

    // --- Newer SDK: collapses wrong-password / user-not-found into one code ---
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect email or password. Please check and try again.';

    // --- Rate limiting / abuse ---
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes and try again.';

    // --- Network ---
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/timeout':
      return 'The request timed out. Please try again.';

    // --- Configuration (usually means Firebase keys / provider not set up) ---
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled for this app yet.';
    case 'auth/configuration-not-found':
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'The app is not connected to its server correctly. Please contact support.';

    // --- Fallback: surface the raw code so it is never just "something went wrong" ---
    default:
      if (code) {
        // e.g. "auth/some-new-code" -> "Some new code"
        const readable = code
          .replace(/^auth\//, '')
          .replace(/-/g, ' ')
          .replace(/^\w/, (c) => c.toUpperCase());
        return `${readable}. Please try again.`;
      }
      return 'Could not complete the request. Please check your details and try again.';
  }
}
