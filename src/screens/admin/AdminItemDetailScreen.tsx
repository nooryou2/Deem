// src/screens/admin/AdminItemDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '@/components/app-text';
import { useLanguage } from '@/i18n/LanguageContext';
import { useItemName } from '@/hooks/useItemName';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchHistory } from '@/services/maintenanceService';
import { getMaintenanceStatus, formatFriendlyDate } from '@/utils/dateCalculations';
import { CATEGORY_LABELS, FREQUENCY_LABELS } from '@/utils/maintenanceTemplates';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { HistoryEntry } from '@/types';
import type { AdminStackParamList } from '@/navigation/AdminNavigator';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminItemDetail'>;

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  overdue: { label: 'Overdue', color: '#D92D20', bg: '#FEE4E2' },
  due_soon: { label: 'Due Soon', color: '#B54708', bg: '#FEF0C7' },
  upcoming: { label: 'Upcoming', color: '#026AA2', bg: '#E0F2FE' },
};

export default function AdminItemDetailScreen({ route }: Props) {
  const { t } = useLanguage();
  const itemName = useItemName();
  const { item } = route.params;
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory(item.id)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [item.id]);

  const status = getMaintenanceStatus(item.nextServiceDate);
  const meta = STATUS_STYLE[status] ?? STATUS_STYLE.upcoming;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {/* Summary */}
      <View style={styles.headerCard}>
        <View style={styles.icon}>
          <Ionicons name="cube-outline" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{itemName(item.name)}</Text>
          <Text style={styles.sub}>{t(CATEGORY_LABELS[item.category] ?? 'Service')}</Text>
          <View style={[styles.pill, { backgroundColor: meta.bg }]}>
            <Text style={[styles.pillText, { color: meta.color }]}>{t(meta.label)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        {(item as any).ownerName ? (
          <Row label={t('Owner')} value={(item as any).ownerName} />
        ) : null}
        <Row label={t('Next Maintenance')} value={formatFriendlyDate(item.nextServiceDate)} />
        <Row
          label={t('Frequency')}
          value={t(FREQUENCY_LABELS[item.frequency] ?? item.frequency)}
        />
        <Row
          label={t('Last Serviced')}
          value={item.lastServiceDate ? formatFriendlyDate(item.lastServiceDate) : t('Not yet recorded')}
          last={!item.notes}
        />
        {item.notes ? <Row label={t('Notes')} value={item.notes} last /> : null}
      </View>

      {/* History */}
      <Text style={styles.sectionTitle}>{t('Completion History')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      ) : history.length === 0 ? (
        <View style={styles.card}>
          <Text style={typography.bodySecondary}>{t('No completions recorded yet.')}</Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {history.map((h, i) => (
            <View key={h.id} style={styles.timelineRow}>
              <View style={styles.timelineMarker}>
                <View style={styles.timelineDot}>
                  <Ionicons name="checkmark" size={12} color={colors.white} />
                </View>
                {i < history.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineBody}>
                <Text style={styles.timelineDate}>{formatFriendlyDate(h.completedDate)}</Text>
                <Text style={styles.timelineText}>{t('Maintenance completed')}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  const { rtl } = useLanguage();
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { textAlign: rtl ? 'left' : 'right' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
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
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.h3 },
  sub: { ...typography.caption, marginTop: 1 },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  pillText: { fontSize: 10, fontWeight: '700' },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { ...typography.bodySecondary, flex: 1 },
  rowValue: { ...typography.body, fontWeight: '600', flexShrink: 1 },

  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  timeline: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  timelineRow: { flexDirection: 'row', gap: spacing.md },
  timelineMarker: { alignItems: 'center', width: 24 },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.completed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  timelineBody: { flex: 1, paddingBottom: spacing.lg },
  timelineDate: { ...typography.body, fontWeight: '700' },
  timelineText: { ...typography.caption, marginTop: 1 },
});
