import { useCompanyId } from '@/hooks/useCompanyId';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatTimeSlot as prettyTime } from '@/utils/dateCalculations';
// src/screens/provider/ProviderScheduleScreen.tsx
import Button from '@/components/Button';
import Calendar from '@/components/Calendar';
import Text from '@/components/app-text';
import type { ProviderStackParamList } from '@/navigation/ProviderNavigator';
import {
fetchProviderBookings,
getAvailability,
saveAvailability,
toggleBlockedDate,
updateBookingStatus
} from '@/services/bookingService';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import { Booking,BookingStatus,ProviderAvailability } from '@/types';
import { CATEGORY_ICONS } from '@/utils/maintenanceTemplates';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useCallback,useState } from 'react';
import {
Alert,
Modal,
Platform,
ScrollView,
StyleSheet,
TouchableOpacity,
View,
} from 'react-native';



const SLOT_OPTIONS = [30, 60, 90, 120];

/**
 * Presents a booking in the shape the shared RequestDetail screen expects, so
 * bookings and service requests can use one detail view.
 */
function toRequest(b: Booking) {
  return {
    id: b.id,
    homeownerId: b.customerId,
    homeownerName: b.customerName,
    providerId: b.providerId,
    providerName: b.providerName,
    maintenanceItemId: (b as any).maintenanceItemId ?? null,
    serviceType: (b as any).applianceName?.trim() || 'Booked service',
    category: b.category,
    status: b.status,
    notes: b.description ?? '',
    attachments: b.attachments ?? [],
    location: b.location ?? null,
    preferredDate: b.date,
    timeSlot: b.timeSlot,
    locationId: (b as any).locationId ?? null,
    isEmergency: false,
    appliances: [],
    assignedEmployeeId: b.assignedEmployeeId ?? null,
    assignedEmployeeName: b.assignedEmployeeName ?? null,
    isBooking: true as const,
    createdAt: b.createdAt,
    updatedAt: b.createdAt,
  } as any;
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<ProviderStackParamList, 'ProviderSchedule'>,
  NativeStackScreenProps<ProviderStackParamList>
>;

export default function ProviderScheduleScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const companyId = useCompanyId();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<ProviderAvailability | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'block'>('view');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!companyId) return;
    fetchProviderBookings(companyId)
      .then(setBookings)
      .catch(() => {});
    getAvailability(companyId)
      .then(setAvailability)
      .catch(() => {});
  }, [companyId]);

  useFocusEffect(load);

  function notify(msg: string) {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Schedule', msg);
  }

  const bookedDates = Array.from(
    new Set(bookings.filter((b) => b.status !== 'declined').map((b) => b.date)),
  );
  const dayBookings = selectedDate
    ? bookings.filter((b) => b.date === selectedDate && b.status !== 'declined')
    : [];

  async function handleDayPress(date: string) {
    if (mode === 'block' && companyId) {
      const updated = await toggleBlockedDate(companyId, date);
      setAvailability(updated);
    } else {
      setSelectedDate(date);
    }
  }

  async function setStatus(b: Booking, status: BookingStatus) {
    setBusy(true);
    try {
      await updateBookingStatus(b.id, status);
      setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, status } : x)));
    } catch {
      notify('Could not update booking.');
    } finally {
      setBusy(false);
    }
  }

  async function saveHours(next: ProviderAvailability) {
    if (!companyId) return;
    try {
      await saveAvailability(companyId, next);
      setAvailability(next);
    } catch {
      notify(t('Could not save. Please try again.'));
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {/* Mode toggle + settings */}
      <View style={styles.topRow}>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'view' && styles.modeBtnOn]}
            onPress={() => setMode('view')}
          >
            <Text style={[styles.modeText, mode === 'view' && styles.modeTextOn]}>
              {t('Bookings')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'block' && styles.modeBtnOn]}
            onPress={() => setMode('block')}
          >
            <Text style={[styles.modeText, mode === 'block' && styles.modeTextOn]}>
              {t('Block Dates')}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.gearBtn} onPress={() => setSettingsOpen(true)}>
          <Text style={{ fontSize: 18 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {mode === 'block' && (
        <Text style={styles.hint}>
          {t('Tap any date to mark it unavailable (or free it again).')}
        </Text>
      )}

      <Calendar
        selectedDate={mode === 'view' ? selectedDate : null}
        onSelectDate={handleDayPress}
        markedDates={bookedDates}
        blockedDates={availability?.blockedDates ?? []}
        disablePast={false}
        allowBlockedPress={mode === 'block'}
        markerColor={colors.primary}
      />

      {/* Day bookings */}
      {mode === 'view' && selectedDate && (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={styles.dayTitle}>{selectedDate}</Text>
          {dayBookings.length === 0 ? (
            <Text style={styles.emptyNote}>{t('No bookings on this day.')}</Text>
          ) : (
            dayBookings.map((b) => (
              <View key={b.id} style={styles.bookingCard}>
                <TouchableOpacity
                  style={styles.bookingHeader}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('RequestDetail', { request: toRequest(b) })}
                >
                  <Text style={styles.bookingIcon}>{CATEGORY_ICONS[b.category] ?? '🛠️'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingTime}>{prettyTime(b.timeSlot)}</Text>
                    <Text style={styles.bookingCustomer}>{b.customerName}</Text>
                  </View>
                  <View style={[styles.statusPill, statusStyle(b.status).pill]}>
                    <Text style={[styles.statusText, statusStyle(b.status).text]}>{b.status}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textMuted}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
                {b.description ? <Text style={styles.bookingDesc}>{b.description}</Text> : null}

                {b.status === 'pending' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actBtn, styles.declineBtn]}
                      onPress={() => setStatus(b, 'declined')}
                      disabled={busy}
                    >
                      <Text style={styles.declineText}>{t('Decline')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actBtn, styles.acceptBtn]}
                      onPress={() => setStatus(b, 'accepted')}
                      disabled={busy}
                    >
                      <Text style={styles.acceptText}>{t('Accept')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {b.status === 'accepted' && (
                  <TouchableOpacity
                    style={[styles.actBtn, styles.acceptBtn, { marginTop: spacing.sm }]}
                    onPress={() => setStatus(b, 'in_progress')}
                    disabled={busy}
                  >
                    <Text style={styles.acceptText}>{t('Start Work')}</Text>
                  </TouchableOpacity>
                )}
                {b.status === 'in_progress' && (
                  <TouchableOpacity
                    style={[styles.actBtn, styles.acceptBtn, { marginTop: spacing.sm }]}
                    onPress={() => setStatus(b, 'completed')}
                    disabled={busy}
                  >
                    <Text style={styles.acceptText}>{t('Mark Completed')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* Availability settings modal */}
      <Modal visible={settingsOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('Working Hours & Slots')}</Text>
            {availability && (
              <>
                <Text style={styles.settingLabel}>
                  {t('Start hour:')} {availability.startHour}:00
                </Text>
                <HourStepper
                  value={availability.startHour}
                  min={0}
                  max={availability.endHour - 1}
                  onChange={(v) => saveHours({ ...availability, startHour: v })}
                />
                <Text style={styles.settingLabel}>
                  {t('End hour:')} {availability.endHour}:00
                </Text>
                <HourStepper
                  value={availability.endHour}
                  min={availability.startHour + 1}
                  max={23}
                  onChange={(v) => saveHours({ ...availability, endHour: v })}
                />
                <Text style={styles.settingLabel}>{t('Slot duration')}</Text>
                <View style={styles.slotOptRow}>
                  {SLOT_OPTIONS.map((mins) => {
                    const on = availability.slotMinutes === mins;
                    return (
                      <TouchableOpacity
                        key={mins}
                        style={[styles.slotOpt, on && styles.slotOptOn]}
                        onPress={() => saveHours({ ...availability, slotMinutes: mins })}
                      >
                        <Text style={[styles.slotOptText, on && styles.slotOptTextOn]}>
                          {mins < 60 ? `${mins}m` : `${mins / 60}h${mins % 60 ? '30' : ''}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
            <Button
              label={t('Done')}
              onPress={() => setSettingsOpen(false)}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function HourStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepBtn} onPress={() => value > min && onChange(value - 1)}>
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepValue}>{value}:00</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={() => value < max && onChange(value + 1)}>
        <Text style={styles.stepBtnText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

function statusStyle(status: string) {
  switch (status) {
    case 'accepted':
      return { pill: { backgroundColor: '#DBEAFE' }, text: { color: '#1D4ED8' } };
    case 'in_progress':
      return { pill: { backgroundColor: '#EDE9FE' }, text: { color: '#6D28D9' } };
    case 'completed':
      return { pill: { backgroundColor: '#DCFCE7' }, text: { color: '#15803D' } };
    case 'declined':
      return { pill: { backgroundColor: '#FEE2E2' }, text: { color: '#B91C1C' } };
    default:
      return { pill: { backgroundColor: '#FEF3C7' }, text: { color: '#B45309' } };
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  container: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  modeToggle: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    padding: 3,
  },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: 'center' },
  modeBtnOn: { backgroundColor: colors.surface },
  modeText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  modeTextOn: { color: colors.primary },
  gearBtn: {
    marginLeft: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { ...typography.caption, marginBottom: spacing.sm },
  dayTitle: { ...typography.h3, marginBottom: spacing.sm },
  emptyNote: { ...typography.bodySecondary },
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  bookingHeader: { flexDirection: 'row', alignItems: 'center' },
  bookingIcon: { fontSize: 22, marginRight: spacing.md },
  bookingTime: { ...typography.body, fontWeight: '700' },
  bookingCustomer: { ...typography.caption, marginTop: 2 },
  statusPill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  bookingDesc: { ...typography.bodySecondary, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  acceptBtn: { backgroundColor: colors.primary },
  declineBtn: { backgroundColor: '#FEE2E2' },
  acceptText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  declineText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },

  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: { ...typography.h2, marginBottom: spacing.md },
  settingLabel: {
    ...typography.bodySecondary,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 22, color: colors.primary, fontWeight: '700' },
  stepValue: { ...typography.h3, minWidth: 70, textAlign: 'center' },
  slotOptRow: { flexDirection: 'row', gap: spacing.sm },
  slotOpt: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  slotOptOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  slotOptText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  slotOptTextOn: { color: colors.primary },
});
