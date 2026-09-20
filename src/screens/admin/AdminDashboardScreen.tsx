// src/screens/admin/AdminDashboardScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAdminStats } from '@/services/adminService';
import { getMaintenanceStatus, formatFriendlyDate } from '@/utils/dateCalculations';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import type { AdminStackParamList } from '@/navigation/AdminNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AdminStackParamList, 'AdminDashboard'>,
  NativeStackScreenProps<AdminStackParamList>
>;

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  overdue: { label: 'Overdue', color: '#D92D20', bg: '#FEE4E2' },
  due_soon: { label: 'Due Soon', color: '#B54708', bg: '#FEF0C7' },
  upcoming: { label: 'Upcoming', color: '#026AA2', bg: '#E0F2FE' },
};

export default function AdminDashboardScreen({ navigation }: Props) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchAdminStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAdminStats()
        .then(setStats)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading || !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Dashboard</Text>
      <Text style={styles.pageSub}>Overview of your application</Text>

      {/* Headline counts */}
      <View style={styles.statGrid}>
        <Stat
          label="Total Users"
          value={stats.totalUsers}
          icon="people-outline"
          tint="#E0F2FE"
          color="#026AA2"
        />
        <Stat
          label="Maintenance Items"
          value={stats.totalItems}
          icon="construct-outline"
          tint="#FAF5EA"
          color="#7A4100"
        />
        <Stat
          label="Upcoming"
          value={stats.upcoming}
          icon="time-outline"
          tint="#E0F2FE"
          color="#026AA2"
        />
        <Stat
          label="Due Soon"
          value={stats.dueSoon}
          icon="alert-circle-outline"
          tint="#FEF0C7"
          color="#B54708"
        />
        <Stat
          label="Overdue"
          value={stats.overdue}
          icon="warning-outline"
          tint="#FEE4E2"
          color="#D92D20"
        />
        <Stat
          label="Completed"
          value={stats.completed}
          icon="checkmark-circle-outline"
          tint="#D1FADF"
          color="#079455"
        />
      </View>

      {/* Needs attention */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Needs Attention</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AdminActivity')}>
          <Text style={styles.link}>View All</Text>
        </TouchableOpacity>
      </View>

      {stats.needsAttention.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>Nothing overdue or due soon. All clear.</Text>
        </View>
      ) : (
        stats.needsAttention.slice(0, 8).map((item) => {
          const status = getMaintenanceStatus(item.nextServiceDate);
          const meta = STATUS_STYLE[status] ?? STATUS_STYLE.upcoming;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.row}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AdminItemDetail', { item })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSub}>
                  {item.ownerName} · {formatFriendlyDate(item.nextServiceDate)}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: meta.bg }]}>
                <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  icon,
  tint,
  color,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: tint }]}>
      <View style={styles.statTop}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  pageTitle: { ...typography.h2 },
  pageSub: { ...typography.caption, marginTop: 2, marginBottom: spacing.lg },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    width: '48%',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { ...typography.caption, marginTop: 2 },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  rowTitle: { ...typography.body, fontWeight: '700' },
  rowSub: { ...typography.caption, marginTop: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontSize: 11, fontWeight: '700' },
  emptyText: { ...typography.bodySecondary },
});
