// src/components/ServiceVisitSheet.tsx
//
// Details of one past service visit, opened from a "Previous Services" entry.
// Kept separate from the screen so the Serviced log can show the same thing.

import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '@/components/app-text';
import Button from '@/components/Button';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatFriendlyDate } from '@/utils/dateCalculations';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { HistoryEntry } from '@/types';

interface Props {
  visit: HistoryEntry | null;
  /** Position in the list, newest first, so the sheet can say "Latest". */
  isLatest?: boolean;
  /** Days since the previous visit, already worded by the caller. */
  gapLabel?: string;
  /** Shown when the visit was done by a provider and isn't rated yet. */
  onRate?: () => void;
  onClose: () => void;
}

export default function ServiceVisitSheet({
  visit,
  isLatest = false,
  gapLabel,
  onRate,
  onClose,
}: Props) {
  const { t } = useLanguage();
  if (!visit) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button">
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>{t('Service details')}</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.dateCard}>
              <View style={styles.dateIcon}>
                <Ionicons name="checkmark-done" size={22} color={colors.completed} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.date}>{formatFriendlyDate(visit.completedDate)}</Text>
                {gapLabel ? <Text style={styles.gap}>{t(gapLabel)}</Text> : null}
              </View>
              {isLatest ? (
                <View style={styles.latest}>
                  <Text style={styles.latestText}>{t('Latest')}</Text>
                </View>
              ) : null}
            </View>

            <Row
              label={t('Serviced by')}
              value={visit.providerName || t('Logged by you')}
              icon={visit.providerName ? 'business-outline' : 'person-outline'}
            />
            <Row
              label={t('How it was recorded')}
              value={visit.bookingId ? t('From a booking') : t('Marked as serviced')}
              icon="document-text-outline"
            />
            {visit.notes ? (
              <Row label={t('Notes')} value={visit.notes} icon="chatbubble-ellipses-outline" />
            ) : null}

            {/* Only a provider visit can be rated, and only once. */}
            {onRate ? (
              <Button
                label={t('Rate this service')}
                onPress={onRate}
                style={{ marginTop: spacing.lg }}
              />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.h3 },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },

  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dateIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.completedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: { ...typography.body, fontWeight: '700' },
  gap: { ...typography.caption, marginTop: 2 },
  latest: {
    backgroundColor: colors.completedBg,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  latestText: { color: colors.completed, fontSize: 10, fontWeight: '700' },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { ...typography.caption },
  rowValue: { ...typography.body, fontWeight: '600', marginTop: 1 },
});
