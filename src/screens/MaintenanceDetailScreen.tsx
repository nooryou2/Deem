import AttachmentPicker from '@/components/attachment-picker';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatTimeSlot as prettyTime } from '@/utils/dateCalculations';
// src/screens/MaintenanceDetailScreen.tsx
import Button from '@/components/Button';
import DatePickerField from '@/components/DatePickerField';
import MapPicker from '@/components/MapPicker';
import ServiceProgressTracker from '@/components/ServiceProgressTracker';
import StatusBadge from '@/components/StatusBadge';
import Text from '@/components/app-text';
import { useAuth } from '@/context/AuthContext';
import { useMaintenanceItems } from '@/hooks/useMaintenanceItems';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import { fetchCustomerBookings } from '@/services/bookingService';
import {
deleteMaintenanceItem,
fetchSingleMaintenanceItem,
markMaintenanceCompleted,
subscribeToHistory,
updateMaintenanceItem,
} from '@/services/maintenanceService';
import { fetchRequestsForHomeowner } from '@/services/requestService';
import { fetchReviewedJobIds } from '@/services/reviewService';
import { getSavedLocations } from '@/services/roleService';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import { Booking,MaintenanceItem,SavedLocation,ServiceRequest } from '@/types';
import { areaLabel } from '@/utils/areas';
import { formatFriendlyDate,getMaintenanceStatus } from '@/utils/dateCalculations';
import { CATEGORY_ICONS,CATEGORY_LABELS,FREQUENCY_LABELS } from '@/utils/maintenanceTemplates';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useEffect,useState } from 'react';
import {
Alert,
Modal,
Platform,
ScrollView,
StyleSheet,
TouchableOpacity,
View,
} from 'react-native';

type Props = NativeStackScreenProps<MainStackParamList, 'MaintenanceDetail'>;

// Slots are stored as 24h "HH:mm"; show them the way people read them.


export default function MaintenanceDetailScreen({ navigation, route }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { items } = useMaintenanceItems();
  const itemFromList = items.find((i) => i.id === route.params.itemId);

  // Keep a local copy so the screen doesn't flash "removed" during refetches,
  // and so we can update it in place right after marking complete.
  const [localItem, setLocalItem] = useState<MaintenanceItem | null>(itemFromList ?? null);
  const [history, setHistory] = useState<{ id: string; completedDate: string }[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [jobLocation, setJobLocation] = useState<SavedLocation | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [reviewedJobs, setReviewedJobs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [serviceDate, setServiceDate] = useState<Date>(new Date());

  // Sync local copy whenever the list version changes (but never overwrite a
  // valid local item with undefined during a transient refetch).
  useEffect(() => {
    if (itemFromList) setLocalItem(itemFromList);
  }, [itemFromList]);

  // The booking document is the source of truth. The copy mirrored onto the
  // task can lag (e.g. if the sync write failed), so prefer the booking when
  // we have it and fall back to the mirrored value otherwise.
  const effectiveBookingStatus = booking?.status ?? localItem?.bookingStatus ?? null;
  // While a provider is actively working the job, the date-based status
  // (Overdue / Due Soon) is misleading — show the booking's own state.
  const bookingInFlight =
    effectiveBookingStatus === 'accepted' || effectiveBookingStatus === 'in_progress';

  const isUnconfirmed =
    effectiveBookingStatus === 'pending' || effectiveBookingStatus === 'declined';

  const item = localItem
    ? { ...localItem, status: getMaintenanceStatus(localItem.nextServiceDate) }
    : null;

  useEffect(() => {
    if (!item) return;
    const unsubscribe = subscribeToHistory(item.id, setHistory);
    return unsubscribe;
  }, [item?.id]);

  // Load any service requests this homeowner has made for this task.
  useFocusEffect(
    React.useCallback(() => {
      if (!user || !item) return;
      // Resolve which saved place this appliance is at, for display.
      if (localItem?.locationId) {
        getSavedLocations(user.uid)
          .then((list) => {
            setJobLocation(list.find((l) => l.id === localItem.locationId) ?? null);
          })
          .catch(() => {});
      } else {
        setJobLocation(null);
      }

      // If this task came from a booking, load it so the screen can show the
      // provider, appointment time, and confirmation state.
      if (localItem?.bookingStatus) {
        fetchCustomerBookings(user.uid)
          .then((list) => {
            const match = list.find((b) => b.maintenanceItemId === localItem.id);
            setBooking(match ?? null);
            // Repair a stale mirrored status while we're here — the homeowner
            // can always write to their own task.
            if (match && match.status !== localItem.bookingStatus) {
              updateMaintenanceItem(localItem.id, { bookingStatus: match.status } as any).catch(
                () => {},
              );
              setLocalItem((prev) => (prev ? { ...prev, bookingStatus: match.status } : prev));
            }
          })
          .catch(() => {});
      } else {
        setBooking(null);
      }

      fetchReviewedJobIds(user.uid)
        .then(setReviewedJobs)
        .catch(() => {});

      fetchRequestsForHomeowner(user.uid)
        .then((all) => setRequests(all.filter((r) => r.maintenanceItemId === route.params.itemId)))
        .catch(() => {});
    }, [user, route.params.itemId, item?.id]),
  );

  if (!item) {
    return (
      <View style={styles.notFound}>
        <Text style={typography.body}>{t('This item was removed.')}</Text>
      </View>
    );
  }

  // item is guaranteed defined past this point; capture it so the handler
  // closures below don't see it as possibly-undefined.
  const currentItem = item;

  async function handleMarkComplete(serviceDate: Date) {
    setBusy(true);
    setShowDatePicker(false);
    try {
      // If a provider accepted and completed this job, record who did it so
      // the visit can be reviewed from the Serviced log.
      const doneByProvider = requests.find(
        (r) => r.status === 'completed' || r.status === 'in_progress',
      );

      await markMaintenanceCompleted(
        currentItem.id,
        currentItem.name,
        currentItem.frequency,
        currentItem.customFrequencyDays,
        currentItem.notificationIds,
        serviceDate,
        doneByProvider
          ? { id: doneByProvider.providerId, name: doneByProvider.providerName }
          : null,
      );
      console.log('Mark complete succeeded for', currentItem.id);
      // Stay on this screen so the user sees the updated next-service date and
      // the new entry appear in Completion History. Refresh local data.
      const refreshed = await fetchSingleMaintenanceItem(currentItem.id);
      if (refreshed) setLocalItem(refreshed);
    } catch (e) {
      console.log('Mark complete FAILED:', e);
      if (Platform.OS === 'web') {
        window.alert('Could not mark complete: ' + ((e as Error)?.message ?? e));
      } else {
        Alert.alert('Error', 'Could not mark this item complete. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function performDelete() {
    setBusy(true);
    try {
      await deleteMaintenanceItem(currentItem.id, currentItem.notificationIds);
      console.log('Delete succeeded for', currentItem.id);
      navigation.goBack();
    } catch (e) {
      console.log('Delete FAILED:', e);
      if (Platform.OS === 'web') {
        window.alert('Could not delete: ' + ((e as Error)?.message ?? e));
      } else {
        Alert.alert('Error', 'Could not delete this item. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    // react-native-web doesn't render Alert.alert buttons, so use the browser's
    // native confirm() on web and the RN Alert on native.
    if (Platform.OS === 'web') {
      const ok = window.confirm(`Delete "${currentItem.name}"? This cannot be undone.`);
      if (ok) performDelete();
      return;
    }
    Alert.alert(
      'Delete this item?',
      `"${currentItem.name}" and its history will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ],
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.icon}>{CATEGORY_ICONS[item.category]}</Text>
        <Text style={typography.h2}>{item.name}</Text>
        <Text style={styles.category}>{t(CATEGORY_LABELS[item.category])}</Text>
        <View style={{ marginTop: spacing.sm }}>
          {isUnconfirmed ? (
            <View style={styles.pendingPill}>
              <Text style={styles.pendingPillText}>
                {effectiveBookingStatus === 'declined'
                  ? t('Booking declined')
                  : t('Awaiting provider confirmation')}
              </Text>
            </View>
          ) : bookingInFlight ? (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>
                {effectiveBookingStatus === 'in_progress'
                  ? t('Service in progress')
                  : t('Booking confirmed')}
              </Text>
            </View>
          ) : (
            <StatusBadge status={item.status} />
          )}
        </View>
      </View>

      <View style={styles.headerCard}>
        <Text style={typography.h3}>{t('Device file')}</Text>
        <Text style={typography.body}>
          {t('Brand and model')}: {item.brandModel || t('Not specified')}
        </Text>
        <Text style={typography.body}>
          {t('Serial number')}: {item.serialNumber || t('Not specified')}
        </Text>
        <Text style={typography.body}>
          {t('Warranty expiry')}: {item.warrantyExpiry || t('Not specified')}
        </Text>
        {!!item.warrantyNotes && <Text style={typography.bodySecondary}>{item.warrantyNotes}</Text>}
        <AttachmentPicker value={item.attachments ?? []} readonly />
      </View>
      {/* Where the appliance is, with directions for whoever is attending. */}
      {jobLocation && (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>{t('Location')}</Text>
          <View style={styles.addressBlock}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>{t(jobLocation.label)}</Text>
              {jobLocation.address ? (
                <Text style={styles.addressLine}>{jobLocation.address}</Text>
              ) : null}
              {jobLocation.area ? (
                <Text style={styles.addressLine}>{t(areaLabel(jobLocation.area))}</Text>
              ) : null}
            </View>
          </View>
          <MapPicker
            value={{ lat: jobLocation.lat, lng: jobLocation.lng }}
            onChange={() => {}}
            readonly
            height={170}
          />
        </View>
      )}

      {/* Booking details, when this task came from a calendar booking */}
      {booking && (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>{t('Booking')}</Text>
          <InfoRow label={t('Provider')} value={booking.providerName} />
          <InfoRow label={t('Appointment')} value={formatFriendlyDate(booking.date)} />
          <InfoRow label={t('Time')} value={prettyTime(booking.timeSlot)} />
          <InfoRow
            label={t('Status')}
            value={
              booking.status === 'pending'
                ? t('Waiting for provider')
                : booking.status === 'accepted'
                  ? t('Confirmed')
                  : booking.status === 'in_progress'
                    ? t('In progress')
                    : booking.status === 'declined'
                      ? t('Declined')
                      : t('Completed')
            }
          />
          {booking.description ? (
            <InfoRow label={t('Your note')} value={booking.description} />
          ) : null}

          {/* A finished booking is exactly when feedback is worth asking for,
              so the prompt belongs here rather than only in the Serviced log. */}
          {booking.status === 'completed' &&
            (reviewedJobs.includes(booking.id) ? (
              <View style={styles.ratedRow}>
                <Ionicons name="checkmark-circle" size={15} color={colors.completed} />
                <Text style={styles.ratedText}>{t('You rated this service')}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.rateBtn}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('WriteReview', {
                    providerId: booking.providerId,
                    providerName: booking.providerName,
                    jobId: booking.id,
                    jobType: 'booking',
                    serviceName: item.name,
                    servicedDate: booking.date,
                  })
                }
              >
                <Ionicons name="star-outline" size={16} color={colors.white} />
                <Text style={styles.rateBtnText}>{t('Rate this service')}</Text>
              </TouchableOpacity>
            ))}
        </View>
      )}

      <View style={styles.infoCard}>
        <InfoRow label={t('Frequency')} value={t(FREQUENCY_LABELS[item.frequency])} />
        <InfoRow
          label={t('Last Serviced')}
          value={
            item.lastServiceDate ? formatFriendlyDate(item.lastServiceDate) : 'Not yet recorded'
          }
        />
        <InfoRow label={t('Next Service Due')} value={formatFriendlyDate(item.nextServiceDate)} />

        {item.notes ? <InfoRow label={t('Notes')} value={item.notes} /> : null}
      </View>

      {/* Nothing has been serviced yet while a booking is unconfirmed, and
          requesting another provider would double-book the job. */}
      {!isUnconfirmed && (
        <Button
          label={t('Mark as Serviced')}
          onPress={() => {
            setServiceDate(new Date());
            setShowDatePicker(true);
          }}
          loading={busy}
          style={{ marginTop: spacing.lg }}
        />
      )}
      <View style={styles.secondaryActions}>
        <Button
          label={t('Edit')}
          variant="secondary"
          onPress={() => navigation.navigate('AddEditMaintenance', { itemId: item.id })}
          style={styles.secondaryButton}
        />
        <Button
          label={t('Delete')}
          variant="danger"
          onPress={handleDelete}
          style={styles.secondaryButton}
        />
      </View>

      {/* Only offer this when no provider is already lined up for the job. */}
      {!booking && (
        <Button
          label={t('Request a Service Provider')}
          variant="secondary"
          onPress={() => navigation.navigate('RequestProvider', { itemId: item.id })}
          style={{ marginTop: spacing.md }}
        />
      )}

      {requests.length > 0 && (
        <View style={styles.requestsBox}>
          <Text style={styles.requestsTitle}>{t('Service Progress')}</Text>
          {requests.map((req) => (
            <View key={req.id}>
              <ServiceProgressTracker status={req.status} providerName={req.providerName} />
            </View>
          ))}
        </View>
      )}

      {/* Date picker for marking a service complete on a chosen date. */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerCard}>
            <Text style={[typography.h3, { marginBottom: spacing.sm }]}>
              {t('When was it serviced?')}
            </Text>
            <Text style={[typography.bodySecondary, { marginBottom: spacing.md }]}>
              {t(
                'Defaults to today. Pick an earlier date if you serviced it before and forgot to log it.',
              )}
            </Text>
            <DatePickerField
              label={t('Service date')}
              value={serviceDate}
              onChange={setServiceDate}
            />
            <View style={styles.pickerActions}>
              <Button
                label={t('Cancel')}
                variant="secondary"
                onPress={() => setShowDatePicker(false)}
                style={styles.secondaryButton}
              />
              <Button
                label={t('Confirm')}
                onPress={() => handleMarkComplete(serviceDate)}
                loading={busy}
                style={styles.secondaryButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Text style={[typography.h3, styles.historyTitle]}>{t('Previous Services')}</Text>
      {history.length === 0 ? (
        <Text style={styles.noHistory}>
          {t(
            'No services logged yet. Tap "Mark as Completed Today" after a service to start building a history.',
          )}
        </Text>
      ) : (
        history.map((entry, index) => {
          // history is newest-first; compute the gap to the next (older) entry.
          const older = history[index + 1];
          let gapLabel = '';
          if (older) {
            const days = Math.round(
              (new Date(entry.completedDate).getTime() - new Date(older.completedDate).getTime()) /
                86400000,
            );
            gapLabel = days >= 0 ? `${days} day${days === 1 ? '' : 's'} after previous` : '';
          } else {
            gapLabel = 'First recorded service';
          }
          return (
            <View key={entry.id} style={styles.historyRow}>
              <View style={styles.historyDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.historyDate}>{formatFriendlyDate(entry.completedDate)}</Text>
                {gapLabel ? <Text style={styles.historyGap}>{gapLabel}</Text> : null}
              </View>
              {index === 0 ? (
                <View style={styles.latestBadge}>
                  <Text style={styles.latestBadgeText}>{t('Latest')}</Text>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { t } = useLanguage();
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{t(label)}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadow.card,
  },
  icon: { fontSize: 36, marginBottom: spacing.sm },
  category: { ...typography.bodySecondary, marginTop: 2 },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadow.card,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { ...typography.bodySecondary },
  infoValue: { ...typography.body, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  secondaryActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  secondaryButton: { flex: 1 },
  historyTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
  noHistory: { ...typography.bodySecondary, lineHeight: 20 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.completed,
    marginRight: spacing.md,
  },
  historyDate: { ...typography.body, fontWeight: '600' },
  historyGap: { ...typography.caption, marginTop: 2 },
  latestBadge: {
    backgroundColor: colors.completedBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  latestBadgeText: { color: colors.completed, fontSize: 11, fontWeight: '700' },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  pickerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  pickerActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  requestsBox: {
    marginTop: spacing.lg,
  },
  requestsTitle: { ...typography.h3, marginBottom: spacing.sm },
  cardTitle: { ...typography.h3, marginBottom: spacing.sm },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 11,
    marginTop: spacing.md,
  },
  rateBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  ratedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  ratedText: { ...typography.caption, color: colors.completed, fontWeight: '600' },
  activePill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  activePillText: { color: '#6D28D9', fontSize: 12, fontWeight: '700' },
  addressBlock: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  addressLabel: { ...typography.body, fontWeight: '700' },
  addressLine: { ...typography.bodySecondary, marginTop: 2 },
  pendingPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  pendingPillText: { color: '#B45309', fontSize: 12, fontWeight: '700' },
});
