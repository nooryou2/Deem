// src/hooks/useMaintenanceItems.ts
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import {
  subscribeToMaintenanceItems,
  fetchMaintenanceItems,
} from '@/services/maintenanceService';
import { fetchRequestsForHomeowner } from '@/services/requestService';
import { fetchCustomerBookings } from '@/services/bookingService';
import { MaintenanceItem, DashboardSummary, ServiceRequestStatus } from '@/types';
import { getMaintenanceStatus } from '@/utils/dateCalculations';
import { isSameMonth, parseISO } from 'date-fns';

// Priority so the "latest meaningful" request wins when a task has several.
const STATUS_PRIORITY: Record<ServiceRequestStatus, number> = {
  in_progress: 5,
  accepted: 4,
  pending: 3,
  completed: 2,
  declined: 1,
};

export function useMaintenanceItems() {
  const { user } = useAuth();
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  // Map of maintenanceItemId -> its most relevant provider-request status.
  const [requestByItem, setRequestByItem] = useState<Record<string, ServiceRequestStatus>>({});
  // Live booking status keyed by maintenance item, read straight from the
  // bookings collection so a stale mirrored value never shows.
  const [bookingByItem, setBookingByItem] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToMaintenanceItems(
      user.uid,
      (fetched) => {
        setItems(fetched);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  // The realtime listener can stall on some networks, so also refetch every
  // time a screen using this hook gains focus. Also refresh provider-request
  // statuses so the badges stay current.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      fetchMaintenanceItems(user.uid)
        .then((fresh) => {
          setItems(fresh);
          setLoading(false);
        })
        .catch(() => {});

      fetchCustomerBookings(user.uid)
        .then((list) => {
          const map: Record<string, string> = {};
          list.forEach((b) => {
            if (b.maintenanceItemId) map[b.maintenanceItemId] = b.status;
          });
          setBookingByItem(map);
        })
        .catch(() => {});

      fetchRequestsForHomeowner(user.uid)
        .then((requests) => {
          const map: Record<string, ServiceRequestStatus> = {};
          requests.forEach((r) => {
            if (!r.maintenanceItemId) return;
            const existing = map[r.maintenanceItemId];
            if (!existing || STATUS_PRIORITY[r.status] > STATUS_PRIORITY[existing]) {
              map[r.maintenanceItemId] = r.status;
            }
          });
          setRequestByItem(map);
        })
        .catch(() => {});
    }, [user])
  );

  const itemsWithStatus = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        status: getMaintenanceStatus(item.nextServiceDate),
        requestStatus: requestByItem[item.id] ?? null,
        // Prefer the live booking status over the mirrored copy on the item.
        bookingStatus: (bookingByItem[item.id] as any) ?? item.bookingStatus ?? null,
      })),
    [items, requestByItem, bookingByItem]
  );

  const summary: DashboardSummary = useMemo(() => {
    const now = new Date();
    // A booking the provider hasn't confirmed (or has declined) isn't a real
    // scheduled service yet, so it shouldn't count towards the date-based
    // Overdue / Due Soon / Upcoming tallies.
    const scheduled = itemsWithStatus.filter(
      (i) => i.bookingStatus !== 'pending' && i.bookingStatus !== 'declined'
    );
    return {
      total: itemsWithStatus.length,
      upcoming: scheduled.filter((i) => i.status === 'upcoming').length,
      dueSoon: scheduled.filter((i) => i.status === 'due_soon').length,
      overdue: scheduled.filter((i) => i.status === 'overdue').length,
      completedThisMonth: itemsWithStatus.filter(
        (i) => i.lastServiceDate && isSameMonth(parseISO(i.lastServiceDate), now)
      ).length,
      onTrack: itemsWithStatus.filter(
        (i) => i.lastServiceDate && i.status === 'upcoming'
      ).length,
    };
  }, [itemsWithStatus]);

  return { items: itemsWithStatus, summary, loading, error };
}
