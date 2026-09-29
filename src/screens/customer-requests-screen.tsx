import Button from '@/components/Button';
import ServiceProgressTracker from '@/components/ServiceProgressTracker';
import Text from '@/components/app-text';
import AttachmentPicker from '@/components/attachment-picker';
import { useCustomerJobs } from '@/hooks/useCustomerJobs';
import { useLanguage } from '@/i18n/LanguageContext';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import { formatFriendlyDate, formatTimeSlot } from '@/utils/dateCalculations';
import { colors, radius, shadow, spacing, typography } from '@/theme/theme';
import type { MaintenanceCategory, ServiceRequestStatus } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const CATEGORY_ICON: Record<MaintenanceCategory, keyof typeof Ionicons.glyphMap> = {
  ac: 'snow-outline',
  water_filter: 'water-outline',
  water_tank: 'cube-outline',
  smoke_detector: 'alert-circle-outline',
  fire_extinguisher: 'flame-outline',
  water_heater: 'thermometer-outline',
  custom: 'construct-outline',
};

const STATUS_META: Record<
  ServiceRequestStatus,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    background: string;
  }
> = {
  pending: {
    label: 'Awaiting provider confirmation',
    icon: 'time-outline',
    color: '#A56717',
    background: '#FFF3E1',
  },
  accepted: {
    label: 'Accepted',
    icon: 'calendar-outline',
    color: '#9A671F',
    background: '#F8ECD9',
  },
  in_progress: {
    label: 'In Progress',
    icon: 'construct-outline',
    color: colors.primaryDark,
    background: colors.primaryLight,
  },
  completed: {
    label: 'Completed',
    icon: 'checkmark-circle',
    color: colors.completed,
    background: colors.completedBg,
  },
  declined: {
    label: 'Request declined',
    icon: 'close-circle-outline',
    color: colors.danger,
    background: colors.overdueBg,
  },
};

export default function CustomerRequestsScreen({
  navigation,
}: NativeStackScreenProps<MainStackParamList, 'MyRequests'>) {
  const { t, rtl } = useLanguage();
  const { jobs, loading, error, retry } = useCustomerJobs();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {loading && <ActivityIndicator color={colors.primary} style={styles.loader} />}

      {!!error && (
        <View style={styles.stateCard}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
          <Text style={styles.stateTitle}>{t(error)}</Text>
          <Button label={t('Retry')} onPress={retry} />
        </View>
      )}

      {!loading && !error && !jobs.length && (
        <View style={styles.stateCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="document-text-outline" size={30} color={colors.primaryDark} />
          </View>
          <Text style={styles.stateTitle}>{t('No requests yet')}</Text>
          <Button label={t('Book a Service')} onPress={() => navigation.navigate('Booking')} />
        </View>
      )}

      {jobs.map((job) => {
        const status = STATUS_META[job.status];
        const categoryIcon = CATEGORY_ICON[job.category] ?? 'construct-outline';
        const hasAttachments = Boolean(job.attachments?.length);

        return (
          <View key={`${job.jobType}_${job.id}`} style={styles.card}>
            <View style={[styles.topRow, rtl && styles.rowReverse]}>
              <View style={styles.serviceInfo}>
                <Text style={[styles.serviceName, rtl && styles.textRight]} numberOfLines={2}>
                  {job.serviceType}
                </Text>
                <Text style={[styles.providerName, rtl && styles.textRight]} numberOfLines={1}>
                  {job.providerName}
                </Text>
              </View>

              <View style={styles.categoryIcon}>
                <Ionicons name={categoryIcon} size={26} color={colors.primaryDark} />
              </View>
            </View>

            <View style={styles.statusDateRow}>
              <View style={[styles.statusPill, { backgroundColor: status.background }]}>
                <Ionicons name={status.icon} size={17} color={status.color} />
                <Text style={[styles.statusText, { color: status.color }]}>{t(status.label)}</Text>
              </View>

              {!!job.preferredDate && (
                <View style={[styles.dateTimeWrap, rtl && styles.rowReverse]}>
                  <View style={[styles.metaItem, rtl && styles.rowReverse]}>
                    <Ionicons name="calendar-outline" size={16} color={colors.primaryDark} />
                    <Text style={styles.metaText}>{formatFriendlyDate(job.preferredDate)}</Text>
                  </View>

                  {!!job.timeSlot && (
                    <>
                      <View style={styles.metaDivider} />
                      <View style={[styles.metaItem, rtl && styles.rowReverse]}>
                        <Ionicons name="time-outline" size={16} color={colors.primaryDark} />
                        <Text style={styles.metaText}>{formatTimeSlot(job.timeSlot)}</Text>
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>

            {!!job.location && (
              <View style={[styles.locationRow, rtl && styles.rowReverse]}>
                <Ionicons name="location-outline" size={17} color={colors.primaryDark} />
                <Text style={[styles.locationText, rtl && styles.textRight]} numberOfLines={2}>
                  {job.location.label}
                  {job.location.address ? ` · ${job.location.address}` : ''}
                </Text>
              </View>
            )}

            {!!job.notes && (
              <Text style={[styles.notes, rtl && styles.textRight]}>{job.notes}</Text>
            )}

            <View style={styles.divider} />

            <ServiceProgressTracker status={job.status} providerName={job.providerName} />

            {hasAttachments && (
              <View style={styles.attachmentsWrap}>
                <AttachmentPicker value={job.attachments ?? []} readonly />
              </View>
            )}

            {(job.maintenanceItemId || job.status === 'completed') && (
              <View style={[styles.actions, rtl && styles.rowReverse]}>
                {job.maintenanceItemId && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.actionButton, styles.actionSecondary]}
                    onPress={() =>
                      navigation.navigate('MaintenanceDetail', {
                        itemId: job.maintenanceItemId!,
                      })
                    }
                  >
                    <Ionicons name="time-outline" size={20} color={colors.primaryDark} />
                    <Text style={styles.actionSecondaryText}>{t('Appliance history')}</Text>
                  </TouchableOpacity>
                )}

                {job.status === 'completed' && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.actionButton, styles.actionPrimary]}
                    onPress={() =>
                      navigation.navigate('WriteReview', {
                        providerId: job.providerId,
                        providerName: job.providerName,
                        jobId: job.id,
                        jobType: job.jobType,
                        serviceName: job.serviceType,
                        servicedDate: job.preferredDate ?? undefined,
                      })
                    }
                  >
                    <Ionicons name="star-outline" size={20} color={colors.white} />
                    <Text style={styles.actionPrimaryText}>{t('Rate Service')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  loader: {
    marginTop: spacing.xl,
  },
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  stateTitle: {
    ...typography.h3,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    ...typography.h3,
    fontWeight: '700',
  },
  providerName: {
    ...typography.bodySecondary,
    marginTop: 2,
  },
  textRight: {
    textAlign: 'right',
  },
  categoryIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDateRow: {
    marginTop: spacing.md,
    gap: spacing.sm,
    width: '100%',
    alignItems: 'stretch',
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    maxWidth: '100%',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  dateTimeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: '100%',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  metaText: {
    ...typography.bodySecondary,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  metaDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: spacing.md,
  },
  locationText: {
    ...typography.caption,
    flex: 1,
    color: colors.textSecondary,
  },
  notes: {
    ...typography.body,
    marginTop: spacing.md,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.md,
  },
  attachmentsWrap: {
    marginTop: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actionSecondary: {
    backgroundColor: colors.primaryLight,
  },
  actionPrimary: {
    backgroundColor: colors.primaryDark,
  },
  actionSecondaryText: {
    ...typography.button,
    color: colors.primaryDark,
  },
  actionPrimaryText: {
    ...typography.button,
    color: colors.white,
  },
});
