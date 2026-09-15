// src/components/MaintenanceCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import StatusBadge from './StatusBadge';
import { MaintenanceItem, MaintenanceStatus, ServiceRequestStatus, BookingStatus } from '@/types';
import { CATEGORY_ICONS, FREQUENCY_LABELS } from '@/utils/maintenanceTemplates';
import { formatFriendlyDate, daysUntil } from '@/utils/dateCalculations';

interface Props {
  item: MaintenanceItem & {
    status: MaintenanceStatus;
    requestStatus?: ServiceRequestStatus | null;
  };
  onPress: () => void;
}

// Badge for tasks created from a calendar booking, showing where that booking
// stands with the provider.
const BOOKING_META: Record<BookingStatus, { label: string; color: string; tint: string }> = {
  pending: { label: '🕓 Awaiting confirmation', color: '#B45309', tint: '#FEF3C7' },
  accepted: { label: '✓ Booking confirmed', color: '#1D4ED8', tint: '#DBEAFE' },
  in_progress: { label: '🔧 Service in progress', color: '#6D28D9', tint: '#EDE9FE' },
  completed: { label: '✓ Service completed', color: '#15803D', tint: '#DCFCE7' },
  declined: { label: '✕ Booking declined', color: '#B91C1C', tint: '#FEE2E2' },
};

// Provider-request badge styling.
const REQ_META: Record<ServiceRequestStatus, { label: string; color: string; tint: string }> = {
  pending: { label: '🕓 Provider requested', color: '#B45309', tint: '#FEF3C7' },
  accepted: { label: '👍 Provider accepted', color: '#1D4ED8', tint: '#DBEAFE' },
  in_progress: { label: '🔧 Service in progress', color: '#6D28D9', tint: '#EDE9FE' },
  completed: { label: '✅ Serviced by provider', color: '#15803D', tint: '#DCFCE7' },
  declined: { label: '✕ Provider declined', color: '#B91C1C', tint: '#FEE2E2' },
};

export default function MaintenanceCard({ item, onPress }: Props) {
  const days = daysUntil(item.nextServiceDate);
  const dueCopy =
    item.status === 'overdue'
      ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
      : days === 0
      ? 'Due today'
      : `Due in ${days} day${days === 1 ? '' : 's'}`;

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
            {item.name}
          </Text>
          <Text style={styles.meta}>
            {FREQUENCY_LABELS[item.frequency]} · Next: {formatFriendlyDate(item.nextServiceDate)}
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
              {item.bookingStatus === 'declined' ? 'Declined' : 'Pending'}
            </Text>
          </View>
        ) : (
          <StatusBadge status={item.status} />
        )}
      </View>

      {/* Booking state, when this task came from a calendar booking */}
      {bookMeta && (
        <View style={[styles.reqBadge, { backgroundColor: bookMeta.tint }]}>
          <Text style={[styles.reqBadgeText, { color: bookMeta.color }]}>{bookMeta.label}</Text>
        </View>
      )}

      {/* Provider-request indicator (only when a request exists) */}
      {reqMeta && (
        <View style={[styles.reqBadge, { backgroundColor: reqMeta.tint }]}>
          <Text style={[styles.reqBadgeText, { color: reqMeta.color }]}>{reqMeta.label}</Text>
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
