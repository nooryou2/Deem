// src/screens/provider/ProviderRequestsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { useCompanyId } from '@/hooks/useCompanyId';
import { fetchRequestsForProvider, updateRequestStatus } from '@/services/requestService';
import { fetchBookingsAsRequests, updateBookingStatus, freeSlot } from '@/services/bookingService';
import { CATEGORY_ICONS } from '@/utils/maintenanceTemplates';
import { ServiceRequest, ServiceRequestStatus } from '@/types';

const UI = {
  bg: '#FBF9F6',
  card: '#FFFFFF',
  title: '#2E2A25',
  body: '#7A6F63',
  muted: '#B0A697',
  brand: '#D9A15C',
  radius: 16,
};

// Booking slots are stored as 24h "HH:mm"; show them the way people read them.
function prettyTime(slot?: string): string {
  if (!slot) return '';
  const [h, m] = slot.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

const softShadow = {
  shadowColor: '#3D2E1A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.03,
  shadowRadius: 12,
  elevation: 2,
};

type FilterValue = 'all' | ServiceRequestStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_META: Record<ServiceRequestStatus, { label: string; color: string; tint: string }> = {
  pending: { label: 'Pending', color: '#D97706', tint: '#FEF3C7' },
  accepted: { label: 'Accepted', color: '#2563EB', tint: '#DBEAFE' },
  in_progress: { label: 'In Progress', color: '#7C3AED', tint: '#EDE9FE' },
  completed: { label: 'Completed', color: '#16A34A', tint: '#DCFCE7' },
  declined: { label: 'Declined', color: '#DC2626', tint: '#FEE2E2' },
};

import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProviderStackParamList } from '@/navigation/ProviderNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<ProviderStackParamList, 'ProviderRequests'>,
  NativeStackScreenProps<ProviderStackParamList>
>;

export default function ProviderRequestsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const companyId = useCompanyId();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!companyId) return;
    setLoading(true);
    // Service requests and calendar bookings both belong here, so they're
    // fetched together and shown as one list, newest first.
    Promise.all([
      fetchRequestsForProvider(companyId).catch(() => []),
      fetchBookingsAsRequests(companyId).catch(() => []),
    ])
      .then(([reqs, bookings]) => {
        const merged = [...reqs, ...(bookings as any[])];
        merged.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        setRequests(merged as ServiceRequest[]);
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  useFocusEffect(load);

  function notify(msg: string) {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Request', msg);
  }

  async function changeStatus(req: ServiceRequest, status: ServiceRequestStatus) {
    setBusyId(req.id);
    try {
      // Bookings live in a different collection to service requests.
      if ((req as any).isBooking) {
        await updateBookingStatus(req.id, status as any);
        // Declining frees the time slot for other customers.
        if (status === 'declined' && (req as any).preferredDate) {
          await freeSlot(req.providerId, (req as any).preferredDate, (req as any).timeSlot);
        }
      } else {
        await updateRequestStatus(req.id, status);
      }
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status } : r)));
    } catch (e) {
      console.log('updateRequestStatus failed:', e);
      notify('Could not update the request. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  const filtered =
    filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  return (
    <View style={styles.root}>
      {/* Wrapper sizes to its content. Without it a horizontal ScrollView in a
          flex column stretches and clips the chips on react-native-web. */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = f.value === filter;
            return (
              <TouchableOpacity
                key={f.value}
                onPress={() => setFilter(f.value)}
                activeOpacity={0.8}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={UI.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const meta = STATUS_META[item.status];
            const isBusy = busyId === item.id;
            return (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.cardTop}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('RequestDetail', { request: item })}
                >
                  <View style={styles.icon}>
                    <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[item.category] ?? '🛠️'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.statusPill, { backgroundColor: meta.tint }]}>
                      <Text style={[styles.statusPillText, { color: meta.color }]}>
                        {meta.label}
                      </Text>
                    </View>
                    <Text style={styles.service}>{item.serviceType}</Text>
                    <Text style={styles.customer}>{item.homeownerName}</Text>
                    {(item as any).isBooking && (item as any).preferredDate ? (
                      <Text style={styles.bookingWhen}>
                        📅 {(item as any).preferredDate} · {prettyTime((item as any).timeSlot)}
                      </Text>
                    ) : null}
                    {item.assignedEmployeeName ? (
                      <Text style={styles.assignedTo}>👷 {item.assignedEmployeeName}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.cardChevron}>›</Text>
                </TouchableOpacity>

                {/* Action buttons based on current status */}
                {item.status === 'pending' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.declineBtn]}
                      disabled={isBusy}
                      onPress={() => changeStatus(item, 'declined')}
                    >
                      <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.acceptBtn]}
                      disabled={isBusy}
                      onPress={() => changeStatus(item, 'accepted')}
                    >
                      <Text style={styles.acceptText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {/* Once accepted, assigning someone is the natural next step,
                    so it sits alongside Start Work rather than being buried in
                    the detail screen. */}
                {(item.status === 'accepted' || item.status === 'in_progress') && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.assignBtn]}
                      disabled={isBusy}
                      onPress={() =>
                        navigation.navigate('RequestDetail', { request: item })
                      }
                    >
                      <Ionicons name="person-add-outline" size={15} color={UI.brand} />
                      <Text style={styles.assignText}>
                        {item.assignedEmployeeName ? 'Reassign' : 'Assign Employee'}
                    </Text>
                  </TouchableOpacity>
                )}

                {item.status === 'accepted' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.fullBtn]}
                    disabled={isBusy}
                    onPress={() => changeStatus(item, 'in_progress')}
                  >
                    <Text style={styles.acceptText}>Start Work</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'in_progress' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.fullBtn]}
                    disabled={isBusy}
                    onPress={() => changeStatus(item, 'completed')}
                  >
                    <Text style={styles.acceptText}>Mark Completed</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No requests here</Text>
              <Text style={styles.emptySub}>
                {filter === 'all'
                  ? 'When a homeowner requests you, it shows up here.'
                  : 'Nothing in this category right now.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  filterBar: { paddingVertical: 12 },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: '#EFE7DB',
  },
  chipActive: { backgroundColor: UI.brand, borderColor: UI.brand },
  chipText: { fontSize: 13, fontWeight: '600', color: UI.body },
  chipTextActive: { color: '#FFFFFF' },

  listContent: { padding: 16, paddingTop: 8 },
  card: {
    backgroundColor: UI.card,
    borderRadius: UI.radius,
    padding: 14,
    marginBottom: 12,
    ...softShadow,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardChevron: { fontSize: 24, color: UI.muted, marginLeft: 8 },
  assignedTo: { fontSize: 12, color: '#6D28D9', fontWeight: '600', marginTop: 3 },
  bookingWhen: { fontSize: 12, color: UI.brand, fontWeight: '700', marginTop: 3 },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  service: { fontSize: 15, fontWeight: '700', color: UI.title, marginTop: 4 },
  customer: { fontSize: 13, color: UI.body, marginTop: 1 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  fullBtn: { backgroundColor: UI.brand, marginTop: 14 },
  acceptBtn: { backgroundColor: UI.brand },
  assignBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: UI.brand,
    marginTop: 10,
  },
  assignText: { color: UI.brand, fontWeight: '700', fontSize: 14 },
  declineBtn: { backgroundColor: '#FEE2E2' },
  acceptText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  declineText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: UI.title },
  emptySub: { fontSize: 13, color: UI.muted, marginTop: 4, textAlign: 'center', paddingHorizontal: 30 },
});
