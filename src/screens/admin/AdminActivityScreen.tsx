// src/screens/admin/AdminActivityScreen.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
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
import { fetchAllItems } from '@/services/adminService';
import SearchBar from '@/components/SearchBar';
import { getMaintenanceStatus, formatFriendlyDate } from '@/utils/dateCalculations';
import { CATEGORY_LABELS } from '@/utils/maintenanceTemplates';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { MaintenanceItem } from '@/types';
import type { AdminStackParamList } from '@/navigation/AdminNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AdminStackParamList, 'AdminActivity'>,
  NativeStackScreenProps<AdminStackParamList>
>;

type Row = MaintenanceItem & { ownerName: string };

const STATUS_FILTERS = ['all', 'overdue', 'due_soon', 'upcoming'] as const;
const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  overdue: { label: 'Overdue', color: '#D92D20', bg: '#FEE4E2' },
  due_soon: { label: 'Due Soon', color: '#B54708', bg: '#FEF0C7' },
  upcoming: { label: 'Upcoming', color: '#026AA2', bg: '#E0F2FE' },
};

export default function AdminActivityScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const itemName = useItemName();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('all');

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAllItems()
        .then(setItems)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (status !== 'all' && getMaintenanceStatus(i.nextServiceDate) !== status) return false;
      if (!q) return true;
      return i.name.toLowerCase().includes(q) || i.ownerName.toLowerCase().includes(q);
    });
  }, [items, search, status]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{t('Maintenance Records')}</Text>
        <Text style={styles.pageSub}>{t('All maintenance activity across users')}</Text>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('Search by item or user…')} />

        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((f) => {
            const on = status === f;
            const meta = STATUS_STYLE[f];
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.chip,
                  on && (meta ? { backgroundColor: meta.bg, borderColor: meta.bg } : styles.chipOn),
                ]}
                onPress={() => setStatus(f)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.chipText,
                    on && (meta ? { color: meta.color, fontWeight: '700' } : styles.chipTextOn),
                  ]}
                >
                  {t(meta ? meta.label : 'All Status')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.count}>
          {t('Showing')} {fmtNumber(filtered.length)} / {fmtNumber(items.length)}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const s = getMaintenanceStatus(item.nextServiceDate);
          const meta = STATUS_STYLE[s] ?? STATUS_STYLE.upcoming;
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AdminItemDetail', { item })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{itemName(item.name)}</Text>
                <Text style={styles.sub}>
                  {item.ownerName} · {t(CATEGORY_LABELS[item.category] ?? 'Service')}
                </Text>
                <Text style={styles.date}>{t('Due')}: {formatFriendlyDate(item.nextServiceDate)}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: meta.bg }]}>
                <Text style={[styles.pillText, { color: meta.color }]}>{t(meta.label)}</Text>
              </View>
              <DirectionalArrow kind="forward" shape="chevron" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('No records found')}</Text>
          </View>
        }
      />
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
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  pageTitle: { ...typography.h2 },
  pageSub: { ...typography.caption, marginTop: 2, marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextOn: { color: colors.white },
  count: { ...typography.caption, marginTop: spacing.md },

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  name: { ...typography.body, fontWeight: '700' },
  sub: { ...typography.caption, marginTop: 1 },
  date: { ...typography.caption, marginTop: 1 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { ...typography.h3, marginTop: spacing.sm },
});
