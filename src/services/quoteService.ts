import { auth,db } from '@/config/firebase';
import type { ServiceQuote } from '@/types';
import { doc,onSnapshot,runTransaction,serverTimestamp } from 'firebase/firestore';
export const quoteId = (type: 'booking' | 'request', id: string) => `${type}_${id}`;
export function watchQuote(
  type: 'booking' | 'request',
  id: string,
  next: (quote: ServiceQuote | null) => void,
  error: (error: Error) => void,
) {
  return onSnapshot(
    doc(db, 'quotes', quoteId(type, id)),
    (snap) => next(snap.exists() ? ({ ...snap.data(), id: snap.id } as ServiceQuote) : null),
    error,
  );
}
export async function saveQuote(
  input: Omit<ServiceQuote, 'id' | 'status' | 'version' | 'total' | 'currency'>,
) {
  if (
    ![input.inspectionFee, input.servicePrice].every(
      (n) => Number.isFinite(n) && n >= 0 && n <= 100000,
    ) ||
    !input.scope.trim()
  )
    throw new Error('INVALID_QUOTE');
  const reference = doc(db, 'quotes', quoteId(input.jobType, input.jobId));
  await runTransaction(db, async (tx) => {
    const previous = await tx.get(reference);
    const job = await tx.get(
      doc(db, input.jobType === 'booking' ? 'bookings' : 'serviceRequests', input.jobId),
    );
    if (
      !job.exists() ||
      !['pending', 'accepted'].includes(job.data().status) ||
      previous.data()?.status === 'accepted'
    )
      throw new Error('QUOTE_LOCKED');
    tx.set(reference, {
      ...input,
      scope: input.scope.trim(),
      inspectionFee: Math.round(input.inspectionFee * 1000) / 1000,
      servicePrice: Math.round(input.servicePrice * 1000) / 1000,
      total: Math.round((input.inspectionFee + input.servicePrice) * 1000) / 1000,
      currency: 'BHD',
      status: 'pending',
      version: (previous.data()?.version ?? 0) + 1,
      updatedAt: serverTimestamp(),
    });
  });
}
export async function respondToQuote(quote: ServiceQuote, status: 'accepted' | 'declined') {
  await runTransaction(db, async (tx) => {
    const reference = doc(db, 'quotes', quote.id);
    const current = await tx.get(reference);
    const job = await tx.get(
      doc(db, quote.jobType === 'booking' ? 'bookings' : 'serviceRequests', quote.jobId),
    );
    if (!job.exists() || !['pending', 'accepted'].includes(job.data().status))
      throw new Error('QUOTE_CHANGED');
    if (
      !current.exists() ||
      current.data().customerId !== auth.currentUser?.uid ||
      current.data().status !== 'pending' ||
      current.data().version !== quote.version
    )
      throw new Error('QUOTE_CHANGED');
    tx.update(reference, { status, updatedAt: serverTimestamp() });
  });
}
