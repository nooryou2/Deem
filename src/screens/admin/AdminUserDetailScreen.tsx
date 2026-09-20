// src/screens/admin/AdminUserDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchUser, fetchItemsForUser } from '@/services/adminService';
import { getMaintenanceStatus, formatFriendlyDate } from '@/utils/dateCalculations';
import { CATEGORY_LABELS } from '@/utils/maintenanceTemplates';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { AdminUser, MaintenanceItem } from '@/types';
import type { AdminStackParamList } from '@/navigation/AdminNavigator';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminUserDetail'>;

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  overdue: { label: 'Overdue', color: '#D92D20', bg: '#FEE4E2' },
  due_soon: { label: 'Due Soon', color: '#B54708', bg: '#FEF0C7' },
  upcoming: { label: 'Upcoming', color: '#026AA2', bg: '#E0F2FE' },
};

export default function AdminUserDetailScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const [user, setUser] = useState<AdminUser | null>(null);
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchUser(userId), fetchItemsForUser(userId)])
      .then(([u, i]) => {
        setUser(u);
        setItems(i);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={typography.bodySecondary}>User not found.</Text>
      </View>
    );
  }

  const counts = items.reduce(
    (acc, item) => {
      const s = getMaintenanceStatus(item.nextServiceDate);
      acc[s] = (acc[s] ?? 0) + 1;
      if (item.lastServiceDate) acc.completed++;
      return acc;
    },
    { overdue: 0, due_soon: 0, upcoming: 0, completed: 0 } as Record<string, number>
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {/* Identity */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{user.role}</Text>
            </View>
            <Text style={styles.joined}>Joined {formatFriendlyDate(user.createdAt)}</Text>
          </View>
        </View>
      </View>

      {/* Summary */}
      <Text style={styles.sectionTitle}>Maintenance Summary</Text>
      <View style={styles.statRow}>
        <Stat value={items.length} label="Total" color={colors.textPrimary} />
        <Stat value={counts.upcoming} label="Upcoming" color="#026AA2" />
        <Stat value={counts.due_soon} label="Due Soon" color="#B54708" />
        <Stat value={counts.overdue} label="Overdue" color="#D92D20" />
        <Stat value={counts.completed} label="Done" color="#079455" />
      </View>

      {/* Items */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
        Maintenance Items ({items.length})
      </Text>
      {items.length === 0 ? (
        <View style={styles.card}>
          <Text style={typography.bodySecondary}>This user has no items yet.</Text>
        </View>
      ) : (
        items.map((item) => {
          const status = getMaintenanceStatus(item.nextServiceDate);
          const meta = STATUS_STYLE[status] ?? STATUS_STYLE.upcoming;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.row}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('AdminItemDetail', {
                  item: { ...item, ownerName: user.name },
                })
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSub}>
                  {CATEGORY_LABELS[item.category] ?? 'Service'} ·{' '}
                  {formatFriendlyDate(item.nextServiceDate)}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: meta.bg }]}>
                <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
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

  headerCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 16 },
  name: { ...typography.h3 },
  email: { ...typography.caption, marginTop: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  rolePill: {
    backgroundColor: '#D1FADF',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  rolePillText: { color: '#079455', fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  joined: { ...typography.caption },

  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  statRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    ...shadow.card,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 19, fontWeight: '800' },
  statLabel: { ...typography.caption, marginTop: 1 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  rowTitle: { ...typography.body, fontWeight: '700' },
  rowSub: { ...typography.caption, marginTop: 1 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontSize: 10, fontWeight: '700' },
});
