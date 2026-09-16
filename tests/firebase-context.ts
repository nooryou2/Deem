import type { Firestore } from 'firebase/firestore';
export let db: Firestore;
export const auth = { currentUser: null as { uid: string } | null };
export function setTestContext(database: Firestore, uid: string) {
  db = database;
  auth.currentUser = { uid };
}
