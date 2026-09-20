import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import type { ServiceRequest } from '@/types';
import { Timestamp,collection,onSnapshot,query,where } from 'firebase/firestore';
import { useEffect,useState } from 'react';
export type CustomerJob = ServiceRequest & { jobType: 'booking' | 'request' };
export function useCustomerJobs() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<CustomerJob[]>([]);
  const [requests, setRequests] = useState<CustomerJob[]>([]);
  const [loaded, setLoaded] = useState(0);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setBookings([]);
    setRequests([]);
    setLoaded(0);
    setError('');
    if (!user) return;
    const sources = [
      { name: 'bookings', owner: 'customerId', type: 'booking' as const, set: setBookings },
      { name: 'serviceRequests', owner: 'homeownerId', type: 'request' as const, set: setRequests },
    ];
    const stops = sources.map((source, index) =>
      onSnapshot(
        query(collection(db, source.name), where(source.owner, '==', user.uid)),
        (snapshot) => {
          source.set(
            snapshot.docs.map((doc) => {
              const data = doc.data();
              const iso = (value: unknown) =>
                value instanceof Timestamp
                  ? value.toDate().toISOString()
                  : typeof value === 'string'
                    ? value
                    : '';
              return {
                ...data,
                id: doc.id,
                jobType: source.type,
                homeownerId: user.uid,
                homeownerName: data.customerName ?? data.homeownerName,
                serviceType: data.applianceName || data.serviceType || 'Service',
                notes: data.description ?? data.notes ?? '',
                preferredDate: data.date ?? iso(data.preferredDate),
                createdAt: iso(data.createdAt),
                updatedAt: iso(data.updatedAt),
                isBooking: source.type === 'booking',
              } as CustomerJob;
            }),
          );
          setLoaded((value) => value | (1 << index));
        },
        () => {
          setError('Could not load. Please try again.');
          setLoaded((value) => value | (1 << index));
        },
      ),
    );
    return () => stops.forEach((stop) => stop());
  }, [user?.uid, revision]);
  const jobs = [...bookings, ...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { jobs, loading: !!user && loaded !== 3, error, retry: () => setRevision((n) => n + 1) };
}
