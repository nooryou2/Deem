// src/screens/admin/AdminDashboardScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DirectionalArrow from '@/components/DirectionalArrow';
import Text from '@/components/app-text';
import { useLanguage } from '@/i18n/LanguageContext';
import { fmtNumber } from '@/i18n/locale';
import { useItemName } from '@/hooks/useItemName';
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
  const { t } = useLanguage();
  const itemName = useItemName();
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
      <Text style={styles.pageTitle}>{t('Dashboard')}</Text>
      <Text style={styles.pageSub}>{t('Overview of your application')}</Text>

      {/* Providers can only join by invitation, so this is the way in. */}
      <TouchableOpacity
        style={styles.inviteCta}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AdminInvites')}
      >
        <View style={styles.inviteIcon}>
          <Ionicons name="person-add-outline" size={20} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inviteTitle}>{t('Invite Service Provider')}</Text>
          <Text style={styles.inviteSub}>{t('Create a one-time signup link')}</Text>
        </View>
        <DirectionalArrow kind="forward" shape="chevron" size={20} color={colors.primary} />
      </TouchableOpacity>

      {/* Headline counts */}
      <View style={styles.statGrid}>
        <Stat
          label={t('Total Users')}
          value={stats.totalUsers}
          icon="people-outline"
          tint="#E0F2FE"
          color="#026AA2"
        />
        <Stat
          label={t('Maintenance Items')}
          value={stats.totalItems}
          icon="construct-outline"
          tint="#FAF5EA"
          color="#7A4100"
        />
        <Stat
          label={t('Upcoming')}
          value={stats.upcoming}
          icon="time-outline"
          tint="#E0F2FE"
          color="#026AA2"
        />
        <Stat
          label={t('Due Soon')}
          value={stats.dueSoon}
          icon="alert-circle-outline"
          tint="#FEF0C7"
          color="#B54708"
        />
        <Stat
          label={t('Overdue')}
          value={stats.overdue}
          icon="warning-outline"
          tint="#FEE4E2"
          color="#D92D20"
        />
        <Stat
          label={t('Completed')}
          value={stats.completed}
          icon="checkmark-circle-outline"
          tint="#D1FADF"
          color="#079455"
        />
      </View>

      {/* Needs attention */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>{t('Needs Attention')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AdminActivity')}>
          <Text style={styles.link}>{t('View All')}</Text>
        </TouchableOpacity>
      </View>

      {stats.needsAttention.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>{t('Nothing overdue or due soon. All clear.')}</Text>
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
                <Text style={styles.rowTitle}>{itemName(item.name)}</Text>
                <Text style={styles.rowSub}>
                  {item.ownerName} · {formatFriendlyDate(item.nextServiceDate)}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: meta.bg }]}>
                <Text style={[styles.pillText, { color: meta.color }]}>{t(meta.label)}</Text>
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
        <Text style={[styles.statValue, { color }]}>{fmtNumber(value)}</Text>
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
  inviteCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTitle: { ...typography.body, fontWeight: '700', color: colors.primary },
  inviteSub: { ...typography.caption, marginTop: 1 },
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
