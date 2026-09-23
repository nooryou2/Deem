import { useLanguage } from '@/i18n/LanguageContext';
// src/screens/provider/ProviderDashboardScreen.tsx
import Text from '@/components/app-text';
import { useAuth } from '@/context/AuthContext';
import { useCompanyId } from '@/hooks/useCompanyId';
import type { ProviderStackParamList } from '@/navigation/ProviderNavigator';
import { fetchBookingsAsRequests } from '@/services/bookingService';
import { fetchRequestsForProvider } from '@/services/requestService';
import { ServiceRequest } from '@/types';
import { formatFriendlyDate, formatTimeSlot } from '@/utils/dateCalculations';
import { CATEGORY_ICONS } from '@/utils/maintenanceTemplates';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

type Props = CompositeScreenProps<
  BottomTabScreenProps<ProviderStackParamList, 'ProviderDashboard'>,
  NativeStackScreenProps<ProviderStackParamList>
>;

const UI = {
  bg: '#FBF9F6',
  card: '#FFFFFF',
  title: '#2E2A25',
  body: '#7A6F63',
  muted: '#B0A697',
  brand: '#D9A15C',
  radius: 16,
  new: '#2563EB',
  inProgress: '#7C3AED',
  completed: '#16A34A',
};

const softShadow = {
  shadowColor: '#3D2E1A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.03,
  shadowRadius: 12,
  elevation: 2,
};

export default function ProviderDashboardScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const { user, role, companyName } = useAuth();
  const companyId = useCompanyId();
  // Providers greet by their own name; managers see the company they manage.
  const displayName =
    role === 'employee'
      ? companyName || 'your company'
      : user?.displayName?.split(' ')[0] || 'there';
  const firstName = displayName;
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!companyId) return;
      // Include calendar bookings alongside service requests so the overview
      // counts and appointment list reflect everything coming in.
      Promise.all([
        fetchRequestsForProvider(companyId).catch(() => []),
        fetchBookingsAsRequests(companyId).catch(() => []),
      ]).then(([reqs, bookings]) => {
        const merged = [...reqs, ...(bookings as any[])];
        merged.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        setRequests(merged as ServiceRequest[]);
      });
    }, [companyId]),
  );

  const newCount = requests.filter((r) => r.status === 'pending').length;
  const inProgressCount = requests.filter(
    (r) => r.status === 'accepted' || r.status === 'in_progress',
  ).length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;

  const upcoming = requests
    .filter((r) => r.status === 'pending' || r.status === 'accepted' || r.status === 'in_progress')
    .slice(0, 5);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.greeting}>
        {role === 'employee' ? t('Managing') : t('Good morning,')}
      </Text>
      <View style={styles.nameRow}>
        <Text style={styles.name}>{firstName}</Text>
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>
            {role === 'employee' ? t('Manager') : t('Service Provider')}
          </Text>
        </View>
      </View>
      {role === 'employee' && user?.displayName ? (
        <Text style={styles.managerName}>
          {t('Signed in as')} {user.displayName}
        </Text>
      ) : null}

      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>{t('Today Overview')}</Text>
        <View style={styles.overviewRow}>
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewNum, { color: UI.new }]}>{newCount}</Text>
            <Text style={styles.overviewLabel}>{t('New Requests')}</Text>
          </View>
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewNum, { color: UI.inProgress }]}>{inProgressCount}</Text>
            <Text style={styles.overviewLabel}>{t('In Progress')}</Text>
          </View>
          <View style={styles.overviewStat}>
            <Text style={[styles.overviewNum, { color: UI.completed }]}>{completedCount}</Text>
            <Text style={styles.overviewLabel}>{t('Completed')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('Upcoming Appointments')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProviderRequests')}>
          <Text style={styles.viewAll}>{t('View all')}</Text>
        </TouchableOpacity>
      </View>

      {upcoming.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>{t('No requests yet')}</Text>
          <Text style={styles.emptySub}>{t('New homeowner requests will appear here.')}</Text>
        </View>
      ) : (
        upcoming.map((req) => {
          const isNew = req.status === 'pending';
          return (
            <TouchableOpacity
              key={req.id}
              activeOpacity={0.8}
              // Opens this job rather than the list, so the tap lands where
              // the user pointed.
              onPress={() => navigation.navigate('RequestDetail', { request: req })}
              style={styles.apptCard}
            >
              <View style={styles.apptIcon}>
                <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[req.category] ?? '🛠️'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.apptService}>{req.serviceType}</Text>
                <Text style={styles.apptCustomer}>{req.homeownerName}</Text>
                {(req as any).isBooking && (req as any).preferredDate ? (
                  <Text style={styles.apptWhen}>
                    {formatFriendlyDate((req as any).preferredDate)} · {formatTimeSlot((req as any).timeSlot)}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.statusPill, { backgroundColor: isNew ? '#DBEAFE' : '#EDE9FE' }]}>
                <Text style={[styles.statusPillText, { color: isNew ? UI.new : UI.inProgress }]}>
                  {isNew ? t('New') : req.status === 'accepted' ? 'Accepted' : 'In Progress'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
  container: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 15, color: UI.body },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 20 },
  managerName: { fontSize: 13, color: '#64748B', marginTop: -12, marginBottom: 16 },
  name: { fontSize: 24, fontWeight: '800', color: UI.title, marginEnd: 10 },
  verifiedBadge: {
    backgroundColor: '#FCE7D6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  verifiedText: { color: '#C2680E', fontSize: 12, fontWeight: '700' },
  overviewCard: { backgroundColor: UI.card, borderRadius: UI.radius, padding: 18, ...softShadow },
  overviewTitle: { fontSize: 16, fontWeight: '700', color: UI.title, marginBottom: 16 },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  overviewStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    backgroundColor: '#FBF9F6',
    borderRadius: 12,
  },
  overviewNum: { fontSize: 26, fontWeight: '800' },
  overviewLabel: { fontSize: 12, color: UI.muted, marginTop: 4, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: UI.title },
  viewAll: { color: UI.brand, fontSize: 14, fontWeight: '700' },
  apptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.card,
    borderRadius: UI.radius,
    padding: 14,
    marginBottom: 12,
    ...softShadow,
  },
  apptIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 14,
  },
  apptService: { fontSize: 15, fontWeight: '700', color: UI.title },
  apptCustomer: { fontSize: 13, color: UI.body, marginTop: 1 },
  apptWhen: { fontSize: 12, color: UI.brand, fontWeight: '700', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: UI.title },
  emptySub: { fontSize: 13, color: UI.muted, marginTop: 4 },
});
