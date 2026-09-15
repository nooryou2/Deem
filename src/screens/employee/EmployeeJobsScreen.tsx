// src/screens/employee/EmployeeJobsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { fetchRequestsForEmployee } from '@/services/requestService';
import { fetchBookingsForEmployee } from '@/services/bookingService';
import { CATEGORY_ICONS } from '@/utils/maintenanceTemplates';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { ServiceRequest, ServiceRequestStatus } from '@/types';
import type { EmployeeStackParamList } from '@/navigation/EmployeeNavigator';

type Props = NativeStackScreenProps<EmployeeStackParamList, 'EmployeeJobs'>;

const STATUS_META: Record<ServiceRequestStatus, { label: string; color: string; tint: string }> = {
  pending: { label: 'Pending', color: '#D97706', tint: '#FEF3C7' },
  accepted: { label: 'To Start', color: '#2563EB', tint: '#DBEAFE' },
  in_progress: { label: 'In Progress', color: '#7C3AED', tint: '#EDE9FE' },
  completed: { label: 'Completed', color: '#16A34A', tint: '#DCFCE7' },
  declined: { label: 'Declined', color: '#DC2626', tint: '#FEE2E2' },
};

export default function EmployeeJobsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    // Assigned work comes from both service requests and bookings.
    Promise.all([
      fetchRequestsForEmployee(user.uid).catch(() => []),
      fetchBookingsForEmployee(user.uid).catch(() => []),
    ])
      .then(([reqs, bookings]) => {
        const merged = [...reqs, ...(bookings as any[])];
        merged.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        setJobs(merged as ServiceRequest[]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(load);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status];
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('EmployeeJobDetail', { request: item })}
            >
              <View style={styles.icon}>
                <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[item.category] ?? '🛠️'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={[styles.pill, { backgroundColor: meta.tint }]}>
                  <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <Text style={styles.service}>{item.serviceType}</Text>
                <Text style={styles.customer}>{item.homeownerName}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧰</Text>
            <Text style={styles.emptyTitle}>No jobs assigned</Text>
            <Text style={styles.emptySub}>
              When your company assigns you a job, it will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  listContent: { padding: spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  pill: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  pillText: { fontSize: 11, fontWeight: '700' },
  service: { ...typography.body, fontWeight: '700', marginTop: 4 },
  customer: { ...typography.caption, marginTop: 1 },
  chevron: { fontSize: 24, color: colors.textMuted, marginLeft: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 40, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3 },
  emptySub: { ...typography.bodySecondary, textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg },
});
