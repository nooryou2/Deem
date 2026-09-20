import { useLanguage } from '@/i18n/LanguageContext';
// src/components/StatusBadge.tsx
import Text from '@/components/app-text';
import { colors,radius,spacing } from '@/theme/theme';
import { MaintenanceStatus } from '@/types';
import React from 'react';
import { StyleSheet,View } from 'react-native';

const STATUS_CONFIG: Record<MaintenanceStatus, { label: string; fg: string; bg: string }> = {
  upcoming: { label: 'Upcoming', fg: colors.upcoming, bg: colors.upcomingBg },
  due_soon: { label: 'Due Soon', fg: colors.dueSoon, bg: colors.dueSoonBg },
  overdue: { label: 'Overdue', fg: colors.overdue, bg: colors.overdueBg },
  completed: { label: 'Completed', fg: colors.completed, bg: colors.completedBg },
};

export default function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const { t } = useLanguage();
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.fg }]} />
      <Text style={[styles.label, { color: config.fg }]}>{t(config.label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
