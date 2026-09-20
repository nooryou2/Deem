import { db } from '@/config/firebase';
import type { ServiceRequestStatus } from '@/types';
import { calculateNextServiceDate } from '@/utils/dateCalculations';
import { Timestamp,arrayRemove,doc,runTransaction,serverTimestamp } from 'firebase/firestore';
import { quoteId } from './quoteService';

const NEXT: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
  pending: ['accepted', 'declined'],
  accepted: ['in_progress', 'declined'],
  in_progress: ['completed'],
  completed: [],
  declined: [],
};
export async function changeJobStatus(
  type: 'booking' | 'request',
  id: string,
  status: ServiceRequestStatus,
) {
  const collectionName = type === 'booking' ? 'bookings' : 'serviceRequests';
  await runTransaction(db, async (tx) => {
    const jobRef = doc(db, collectionName, id);
    const snapshot = await tx.get(jobRef);
    if (!snapshot.exists()) throw new Error('JOB_NOT_FOUND');
    const job = snapshot.data();
    if (job.status === status) return;
    if (!NEXT[job.status as ServiceRequestStatus]?.includes(status))
      throw new Error('INVALID_TRANSITION');
    const quote =
      status === 'in_progress' ? await tx.get(doc(db, 'quotes', quoteId(type, id))) : null;
    if (status === 'in_progress' && quote?.data()?.status !== 'accepted')
      throw new Error('QUOTE_REQUIRED');
    const itemRef =
      job.maintenanceItemId && (type === 'booking' || job.hasLinkedItem)
        ? doc(db, 'maintenanceItems', job.maintenanceItemId)
        : null;
    const item = itemRef ? await tx.get(itemRef) : null;
    const completed = new Date();
    tx.update(jobRef, { status, updatedAt: serverTimestamp() });
    if (status === 'declined' && type === 'booking') {
      tx.update(doc(db, 'bookedSlots', `${job.providerId}_${job.date}`), {
        slots: arrayRemove(job.timeSlot),
      });
    }
    if (itemRef && item?.exists()) {
      if (status === 'completed') {
        const data = item.data();
        tx.update(itemRef, {
          bookingStatus: status,
          lastServiceDate: Timestamp.fromDate(completed),
          nextServiceDate: Timestamp.fromDate(
            calculateNextServiceDate(completed, data.frequency, data.customFrequencyDays),
          ),
          updatedAt: serverTimestamp(),
        });
      } else tx.update(itemRef, { bookingStatus: status, updatedAt: serverTimestamp() });
    }
    if (status === 'completed') {
      tx.set(doc(db, 'maintenanceHistory', `${type}_${id}`), {
        maintenanceItemId: job.maintenanceItemId ?? null,
        maintenanceItemName: job.applianceName || job.serviceType || 'Service',
        userId: job.customerId || job.homeownerId,
        providerId: job.providerId,
        providerName: job.providerName,
        jobId: id,
        jobType: type,
        completedDate: Timestamp.fromDate(completed),
        createdAt: serverTimestamp(),
      });
    }
  });
}
