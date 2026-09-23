import { useLanguage } from '@/i18n/LanguageContext';
import { useItemName } from '@/hooks/useItemName';
// src/components/MaintenanceCard.tsx
import Text from '@/components/app-text';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import { BookingStatus,MaintenanceItem,MaintenanceStatus,ServiceRequestStatus } from '@/types';
import { daysUntil,formatFriendlyDate } from '@/utils/dateCalculations';
import { CATEGORY_ICONS,FREQUENCY_LABELS } from '@/utils/maintenanceTemplates';
import React from 'react';
import { StyleSheet,TouchableOpacity,View } from 'react-native';
import StatusBadge from './StatusBadge';

interface Props {
  item: MaintenanceItem & {
    status: MaintenanceStatus;
    requestStatus?: ServiceRequestStatus | null;
  };
  onPress: () => void;
}

// Badge for tasks created from a calendar booking, showing where that booking
// stands with the provider.
const BOOKING_META: Record<BookingStatus, { label: string; icon: string; color: string; tint: string }> = {
  pending: { label: 'Awaiting confirmation', icon: '🕓', color: '#B45309', tint: '#FEF3C7' },
  accepted: { label: 'Booking confirmed', icon: '✓', color: '#1D4ED8', tint: '#DBEAFE' },
  in_progress: { label: 'Service in progress', icon: '🔧', color: '#6D28D9', tint: '#EDE9FE' },
  completed: { label: 'Service completed', icon: '✓', color: '#15803D', tint: '#DCFCE7' },
  declined: { label: 'Booking declined', icon: '✕', color: '#B91C1C', tint: '#FEE2E2' },
};

// Provider-request badge styling.
const REQ_META: Record<ServiceRequestStatus, { label: string; icon: string; color: string; tint: string }> = {
  pending: { label: 'Provider requested', icon: '🕓', color: '#B45309', tint: '#FEF3C7' },
  accepted: { label: 'Provider accepted', icon: '👍', color: '#1D4ED8', tint: '#DBEAFE' },
  in_progress: { label: 'Service in progress', icon: '🔧', color: '#6D28D9', tint: '#EDE9FE' },
  completed: { label: 'Serviced by provider', icon: '✅', color: '#15803D', tint: '#DCFCE7' },
  declined: { label: 'Provider declined', icon: '✕', color: '#B91C1C', tint: '#FEE2E2' },
};

export default function MaintenanceCard({ item, onPress }: Props) {
  const { t, tp } = useLanguage();
  const itemName = useItemName();
  const days = daysUntil(item.nextServiceDate);
  const dueCopy =
    item.status === 'overdue'
      ? tp('daysOverdue', Math.abs(days))
      : days === 0
        ? t('Due today')
        : tp('dueInDays', days);

  const reqMeta = item.requestStatus ? REQ_META[item.requestStatus] : null;
  const bookMeta = item.bookingStatus ? BOOKING_META[item.bookingStatus] : null;
  const isUnconfirmedBooking =
    item.bookingStatus === 'pending' || item.bookingStatus === 'declined';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{CATEGORY_ICONS[item.category] ?? '🛠️'}</Text>
        </View>

        <View style={styles.content}>
          <Text style={typography.h3} numberOfLines={1}>
            {itemName(item.name)}
          </Text>
          <Text style={styles.meta}>
            {t(FREQUENCY_LABELS[item.frequency])}
            {t('· Next:')} {formatFriendlyDate(item.nextServiceDate)}
          </Text>
          {!isUnconfirmedBooking && (
            <Text
              style={[
                styles.dueCopy,
                item.status === 'overdue' && { color: colors.overdue },
                item.status === 'due_soon' && { color: colors.dueSoon },
              ]}
            >
              {dueCopy}
            </Text>
          )}
        </View>

        {/* While a booking is still awaiting the provider, the date-based
            status (Due Soon / Upcoming) is misleading — the visit isn't
            confirmed yet — so show the booking state instead. */}
        {isUnconfirmedBooking ? (
          <View style={styles.pendingBadge}>
            <View style={styles.pendingDot} />
            <Text style={styles.pendingLabel}>
              {item.bookingStatus === 'declined' ? t('Declined') : t('Pending')}
            </Text>
          </View>
        ) : (
          <StatusBadge status={item.status} />
        )}
      </View>

      {/* Booking state, when this task came from a calendar booking */}
      {bookMeta && (
        <View style={[styles.reqBadge, { backgroundColor: bookMeta.tint }]}>
          <Text style={[styles.reqBadgeText, { color: bookMeta.color }]}>{bookMeta.icon} {t(bookMeta.label)}</Text>
        </View>
      )}

      {/* Provider-request indicator (only when a request exists) */}
      {reqMeta && (
        <View style={[styles.reqBadge, { backgroundColor: reqMeta.tint }]}>
          <Text style={[styles.reqBadgeText, { color: reqMeta.color }]}>{reqMeta.icon} {t(reqMeta.label)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  meta: {
    ...typography.caption,
    marginTop: 2,
  },
  dueCopy: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    backgroundColor: '#B45309',
  },
  pendingLabel: { fontSize: 12, fontWeight: '600', color: '#B45309' },
  reqBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  reqBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
