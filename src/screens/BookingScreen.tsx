// src/screens/BookingScreen.tsx
//
// Booking runs as a three-step flow:
//   1. Select Service   — category + which of your saved locations it's for
//   2. Provider & Date  — pick a provider, a date, and a time slot
//   3. Review           — confirm the details before booking
//
// Payment is intentionally not part of this flow yet.

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { useAreaFilteredProviders } from '@/hooks/useAreaFilteredProviders';
import { getSavedLocations } from '@/services/roleService';
import { useMaintenanceItems } from '@/hooks/useMaintenanceItems';
import { getAvailableSlots, createBooking } from '@/services/bookingService';
import { createMaintenanceItem } from '@/services/maintenanceService';
import Calendar from '@/components/Calendar';
import Button from '@/components/Button';
import InputField from '@/components/InputField';
import StepIndicator from '@/components/StepIndicator';
import StarRating from '@/components/StarRating';
import { CATEGORY_LABELS } from '@/utils/maintenanceTemplates';
import { areaLabel } from '@/utils/areas';
import { applianceLabel } from '@/utils/appliances';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { MaintenanceCategory, SavedLocation } from '@/types';
import type { MainStackParamList } from '@/navigation/MainNavigator';

type Props = NativeStackScreenProps<MainStackParamList, 'Booking'>;

const STEPS = ['Select Service', 'Provider & Date', 'Review'];

// Ionicons for each maintenance category, replacing the emoji set.
const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  ac: 'snow-outline',
  water_filter: 'water-outline',
  water_tank: 'cube-outline',
  smoke_detector: 'alert-circle-outline',
  fire_extinguisher: 'flame-outline',
  water_heater: 'thermometer-outline',
  custom: 'construct-outline',
};

function prettyTime(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function BookingScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { providers, loading: loadingProviders } = useAreaFilteredProviders();
  const { items: myAppliances } = useMaintenanceItems();

  const [step, setStep] = useState(0);

  // --- Step 1: service + location ---
  const [category, setCategory] = useState<MaintenanceCategory | null>(null);
  const [applianceName, setApplianceName] = useState('');
  // Whether this booking is for an appliance the user already tracks.
  const [useExisting, setUseExisting] = useState(true);
  const [applianceId, setApplianceId] = useState<string | null>(null);
  const [appliancePickerOpen, setAppliancePickerOpen] = useState(false);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);

  // --- Step 2: provider + date + slot ---
  const [providerQuery, setProviderQuery] = useState('');
  const [providerListOpen, setProviderListOpen] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(route.params?.providerId ?? null);
  const [providerName, setProviderName] = useState<string | null>(
    route.params?.providerName ?? null
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [providerBlockedDates, setProviderBlockedDates] = useState<string[]>([]);
  const [providerOffDays, setProviderOffDays] = useState<number[]>([]);

  // --- Step 3 ---
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [savingAppliance, setSavingAppliance] = useState(false);
  const [bookedSummary, setBookedSummary] = useState<{
    date: string;
    slot: string;
    name: string;
  } | null>(null);

  /** Adds the just-booked appliance to the user's tracked list. */
  async function addToTracker() {
    if (!user || !category) return;
    setSavingAppliance(true);
    try {
      await createMaintenanceItem({
        userId: user.uid,
        name: applianceName.trim() || CATEGORY_LABELS[category],
        category,
        frequency: 'every_6_months',
        lastServiceDate: null,
        locationId,
      });
      notify('Added to your appliances.');
      navigation.goBack();
    } catch (e) {
      console.log('createMaintenanceItem failed:', e);
      notify('Could not add it. You can register it from the Maintenance tab.');
    } finally {
      setSavingAppliance(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    getSavedLocations(user.uid)
      .then((list) => {
        setLocations(list);
        if (!locationId && list.length > 0) {
          setLocationId((list.find((l) => l.isDefault) ?? list[0]).id);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load the chosen provider's free slots whenever provider or date changes.
  useEffect(() => {
    if (!providerId || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    getAvailableSlots(providerId, selectedDate)
      .then((res) => {
        setSlots(res.slots);
        setBlocked(res.blocked);
        setProviderBlockedDates(res.availability.blockedDates ?? []);
        setProviderOffDays(res.availability.weeklyOffDays ?? []);
      })
      .finally(() => setLoadingSlots(false));
  }, [providerId, selectedDate]);

  /** Picking a tracked appliance carries its details into the booking. */
  function chooseAppliance(id: string) {
    const found = myAppliances.find((a) => a.id === id);
    if (!found) return;
    setApplianceId(id);
    setApplianceName(found.name);
    setCategory(found.category);
    if (found.locationId) setLocationId(found.locationId);
    setAppliancePickerOpen(false);
  }

  function notify(msg: string) {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Booking', msg);
  }

  // 'custom' is a catch-all used elsewhere in the app; it isn't a bookable
  // service category, so it's excluded here.
  const bookableCategories = useMemo(
    () => Object.entries(CATEGORY_LABELS).filter(([value]) => value !== 'custom'),
    []
  );

  const filteredProviders = useMemo(() => {
    const q = providerQuery.trim().toLowerCase();
    return q ? providers.filter((p) => p.name.toLowerCase().includes(q)) : providers;
  }, [providers, providerQuery]);

  const chosenLocation = locations.find((l) => l.id === locationId) ?? null;
  const selectedProvider = providers.find((p) => p.uid === providerId) ?? null;

  async function handleConfirm() {
    if (!user || !providerId || !selectedDate || !selectedSlot || !category) return;
    setSubmitting(true);
    try {
      await createBooking({
        providerId,
        providerName: providerName ?? 'Provider',
        customerId: user.uid,
        customerName: user.displayName ?? 'Customer',
        category,
        date: selectedDate,
        timeSlot: selectedSlot,
        description: description.trim(),
        applianceName: applianceName.trim(),
        locationId,
      });
      // A new appliance is worth tracking, so confirm inline and offer to add
      // it rather than bouncing straight back with an alert.
      setBookedSummary({
        date: selectedDate,
        slot: selectedSlot,
        name: applianceName.trim() || (category ? CATEGORY_LABELS[category] : 'Service'),
      });
      setDone(true);
    } catch (e: any) {
      if (e?.message === 'SLOT_TAKEN') {
        notify('Sorry, that slot was just taken. Please pick another.');
        const res = await getAvailableSlots(providerId, selectedDate);
        setSlots(res.slots);
        setSelectedSlot(null);
        setStep(1);
      } else {
        notify('Could not confirm the booking. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Each step gates the next, so the user can't skip required choices.
  const canContinue =
    step === 0
      ? Boolean(
          locationId &&
            (useExisting ? applianceId : category && applianceName.trim())
        )
      : step === 1
      ? Boolean(providerId && selectedSlot)
      : true;

  // ---------- Success ----------
  if (done && bookedSummary) {
    return (
      <View style={[styles.root, styles.successRoot]}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={44} color={colors.white} />
        </View>
        <Text style={styles.successTitle}>Booking Confirmed!</Text>
        <Text style={styles.successSub}>
          Your service has been scheduled for {bookedSummary.date} at{' '}
          {prettyTime(bookedSummary.slot)}.
        </Text>

        {/* Only offered for an appliance that isn't tracked yet. */}
        {!useExisting && (
          <View style={styles.offerBox}>
            <Text style={styles.offerText}>
              Would you like to add this appliance to your maintenance tracker?
            </Text>
            <View style={styles.offerItem}>
              <Ionicons
                name={CATEGORY_ICON[category ?? 'custom'] ?? 'cube-outline'}
                size={20}
                color={colors.primary}
              />
              <Text style={styles.offerItemText}>{bookedSummary.name}</Text>
            </View>
          </View>
        )}

        <View style={styles.successActions}>
          {!useExisting && (
            <Button
              label="Add to My Appliances"
              onPress={addToTracker}
              loading={savingAppliance}
            />
          )}
          <Button
            label={useExisting ? 'Done' : 'Not Now'}
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <StepIndicator steps={STEPS} current={step} />

        {/* ---------- STEP 1: Service + Location ---------- */}
        {step === 0 && (
          <>
            {/* Booking for something already tracked saves re-entering its
                details, so it's offered first. */}
            <Text style={styles.sectionTitle}>Service for</Text>
            <TouchableOpacity
              style={[styles.choiceRow, useExisting && styles.choiceRowOn]}
              activeOpacity={0.8}
              onPress={() => setUseExisting(true)}
            >
              <Ionicons
                name={useExisting ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={useExisting ? colors.primary : colors.border}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.choiceTitle, useExisting && styles.choiceTitleOn]}>
                  Existing appliance
                </Text>
                <Text style={styles.choiceSub}>Choose from your registered appliances</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.choiceRow, !useExisting && styles.choiceRowOn]}
              activeOpacity={0.8}
              onPress={() => {
                setUseExisting(false);
                setApplianceId(null);
              }}
            >
              <Ionicons
                name={!useExisting ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={!useExisting ? colors.primary : colors.border}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.choiceTitle, !useExisting && styles.choiceTitleOn]}>
                  New / unregistered appliance
                </Text>
                <Text style={styles.choiceSub}>Enter the details manually</Text>
              </View>
            </TouchableOpacity>

            {useExisting && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
                  Select Appliance
                </Text>
                {myAppliances.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="cube-outline" size={20} color={colors.textMuted} />
                    <Text style={styles.emptyBoxTitle}>No appliances yet</Text>
                    <Text style={styles.emptyBoxText}>
                      Register one from the Maintenance tab, or choose "New appliance" above.
                    </Text>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.dropdown}
                      activeOpacity={0.7}
                      onPress={() => setAppliancePickerOpen((v) => !v)}
                    >
                      <Ionicons
                        name={CATEGORY_ICON[category ?? 'custom'] ?? 'cube-outline'}
                        size={20}
                        color={colors.primary}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.dropdownText,
                            !applianceId && styles.dropdownPlaceholder,
                          ]}
                        >
                          {applianceId
                            ? myAppliances.find((a) => a.id === applianceId)?.name
                            : 'Choose an appliance'}
                        </Text>
                        {applianceId && chosenLocation ? (
                          <Text style={styles.dropdownSub}>{chosenLocation.label}</Text>
                        ) : null}
                      </View>
                      <Ionicons
                        name={appliancePickerOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>

                    {appliancePickerOpen && (
                      <View style={styles.dropdownList}>
                        {myAppliances.map((a) => (
                          <TouchableOpacity
                            key={a.id}
                            style={styles.dropdownItem}
                            activeOpacity={0.7}
                            onPress={() => chooseAppliance(a.id)}
                          >
                            <Ionicons
                              name={CATEGORY_ICON[a.category] ?? 'cube-outline'}
                              size={18}
                              color={colors.primary}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.dropdownItemText}>{a.name}</Text>
                              <Text style={styles.dropdownSub}>
                                {CATEGORY_LABELS[a.category]}
                              </Text>
                            </View>
                            {applianceId === a.id && (
                              <Ionicons name="checkmark" size={17} color={colors.primary} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </>
            )}

            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
              Service Categories
            </Text>
            <View style={[styles.grid, useExisting && applianceId ? styles.gridLocked : null]}>
              {bookableCategories.map(([value, label]) => {
                const on = category === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.tile, on && styles.tileOn]}
                    onPress={() => setCategory(value as MaintenanceCategory)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={CATEGORY_ICON[value] ?? 'construct-outline'}
                      size={26}
                      color={on ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.tileLabel, on && styles.tileLabelOn]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {!useExisting && (
              <>
                <Text style={styles.sectionTitle}>Appliance Name</Text>
                <Text style={styles.fieldHint}>
                  Give it a name so the technician knows which unit, e.g. "Living room AC".
                </Text>
                <InputField
                  label=""
                  placeholder="e.g. Living room AC"
                  value={applianceName}
                  onChangeText={setApplianceName}
                />
              </>
            )}

            <Text style={styles.sectionTitle}>Service Location</Text>
            {locations.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="location-outline" size={18} color={colors.textMuted} />
                <Text style={styles.emptyBoxText}>
                  No saved locations. Add one from Profile → My Locations.
                </Text>
              </View>
            ) : (
              locations.map((loc) => {
                const on = locationId === loc.id;
                return (
                  <TouchableOpacity
                    key={loc.id}
                    style={[styles.locRow, on && styles.locRowOn]}
                    onPress={() => setLocationId(loc.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={on ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={on ? colors.primary : colors.border}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.locLabel, on && styles.locLabelOn]}>{loc.label}</Text>
                      {loc.address ? (
                        <Text style={styles.locAddress} numberOfLines={1}>
                          {loc.address}
                        </Text>
                      ) : null}
                      {loc.area ? <Text style={styles.locArea}>{areaLabel(loc.area)}</Text> : null}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {/* ---------- STEP 2: Provider + Date + Slot ---------- */}
        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>Select Provider</Text>

            {/* Search field. Once a provider is picked they appear as a
                removable chip inside the field, like a token input. */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setProviderListOpen(true)}
              style={[styles.searchBox, providerListOpen && styles.searchBoxOpen]}
            >
              <Ionicons name="search" size={17} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={providerQuery}
                onChangeText={(t) => {
                  setProviderQuery(t);
                  setProviderListOpen(true);
                }}
                onFocus={() => setProviderListOpen(true)}
                placeholder="Search provider…"
                placeholderTextColor={colors.textMuted}
              />
              <Ionicons
                name={providerListOpen ? 'chevron-up' : 'chevron-down'}
                size={17}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {/* The chosen provider stays visible as a card beneath the search
                field, so the selection is clear once the list is closed. */}
            {selectedProvider && !providerListOpen && (
              <View style={styles.selectedCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {selectedProvider.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.provName} numberOfLines={1}>
                      {selectedProvider.name}
                    </Text>
                    {selectedProvider.rating && selectedProvider.rating.count >= 5 ? (
                      <View style={styles.verifiedPill}>
                        <Ionicons
                          name="shield-checkmark"
                          size={10}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.verifiedText}>verified</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.provSpecialty} numberOfLines={1}>
                    {(selectedProvider.appliances ?? []).slice(0, 2).map(applianceLabel).join(' · ') ||
                      'General Home Support'}
                  </Text>
                  {selectedProvider.rating && selectedProvider.rating.count > 0 ? (
                    <View style={styles.provRating}>
                      <StarRating value={selectedProvider.rating.averageStars} readonly size={13} />
                      <Text style={styles.provRatingText}>
                        {selectedProvider.rating.averageStars.toFixed(1)} (
                        {selectedProvider.rating.count})
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.provNoRating}>No reviews yet</Text>
                  )}
                </View>
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              </View>
            )}

            {providerListOpen && (
              <View style={styles.dropdown}>
                <Text style={styles.dropdownHeader}>
                  {providerQuery ? 'Search results' : 'Recommended'}
                </Text>

                {loadingProviders ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
                ) : filteredProviders.length === 0 ? (
                  <Text style={styles.emptyNote}>
                    {providerQuery
                      ? `No providers match "${providerQuery}".`
                      : 'No providers cover your area yet.'}
                  </Text>
                ) : (
                  <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
                    {filteredProviders.map((p) => {
                      const on = providerId === p.uid;
                      const specialties = (p.appliances ?? [])
                        .slice(0, 2)
                        .map(applianceLabel)
                        .join(' · ');
                      return (
                        <TouchableOpacity
                          key={p.uid}
                          style={[styles.provRow, on && styles.provRowOn]}
                          activeOpacity={0.8}
                          onPress={() => {
                            // Availability is per provider, so reset the slot.
                            setProviderId(p.uid);
                            setProviderName(p.name);
                            setSelectedDate(null);
                            setSelectedSlot(null);
                            setProviderQuery('');
                            setProviderListOpen(false);
                          }}
                        >
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                              {p.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={styles.nameRow}>
                              <Text style={styles.provName} numberOfLines={1}>
                                {p.name}
                              </Text>
                              {p.rating && p.rating.count >= 5 ? (
                                <View style={styles.verifiedPill}>
                                  <Ionicons
                                    name="shield-checkmark"
                                    size={10}
                                    color={colors.textSecondary}
                                  />
                                  <Text style={styles.verifiedText}>verified</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={styles.provSpecialty} numberOfLines={1}>
                              {specialties || 'General Home Support'}
                            </Text>
                            {p.rating && p.rating.count > 0 ? (
                              <View style={styles.provRating}>
                                <StarRating value={p.rating.averageStars} readonly size={13} />
                                <Text style={styles.provRatingText}>
                                  {p.rating.averageStars.toFixed(1)} ({p.rating.count})
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.provNoRating}>No reviews yet</Text>
                            )}
                          </View>
                          {on && (
                            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Choose a Date</Text>
            {!providerId ? (
              <Text style={styles.emptyNote}>Select a provider to see their calendar.</Text>
            ) : (
              <Calendar
                selectedDate={selectedDate}
                onSelectDate={(d) => {
                  setProviderListOpen(false);
                  setSelectedDate(d);
                }}
                blockedDates={providerBlockedDates}
                weeklyOffDays={providerOffDays}
              />
            )}

            {selectedDate && providerId && (
              <View style={{ marginTop: spacing.lg }}>
                <Text style={styles.sectionTitle}>Available Times</Text>
                {loadingSlots ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
                ) : blocked ? (
                  <Text style={styles.blockedNote}>
                    This provider is unavailable on this date.
                  </Text>
                ) : slots.length === 0 ? (
                  <Text style={styles.blockedNote}>
                    No open slots on this day. Try another date.
                  </Text>
                ) : (
                  <View style={styles.slotGrid}>
                    {slots.map((s) => {
                      const on = selectedSlot === s;
                      return (
                        <TouchableOpacity
                          key={s}
                          style={[styles.slot, on && styles.slotOn]}
                          onPress={() => setSelectedSlot(s)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.slotText, on && styles.slotTextOn]}>
                            {prettyTime(s)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* ---------- STEP 3: Review ---------- */}
        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Booking Summary</Text>

            <View style={styles.card}>
              <View style={styles.summaryTop}>
                <View style={styles.summaryIcon}>
                  <Ionicons
                    name={CATEGORY_ICON[category ?? 'custom'] ?? 'construct-outline'}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryService}>
                    {applianceName.trim() || (category ? CATEGORY_LABELS[category] : 'Service')}
                  </Text>
                  {applianceName.trim() && category ? (
                    <Text style={styles.summaryCategory}>{CATEGORY_LABELS[category]}</Text>
                  ) : null}
                </View>
              </View>

              <SummaryRow icon="person-outline" label="Provider" value={providerName ?? '—'} />
              <SummaryRow icon="calendar-outline" label="Date" value={selectedDate ?? '—'} />
              <SummaryRow
                icon="time-outline"
                label="Time Slot"
                value={selectedSlot ? prettyTime(selectedSlot) : '—'}
                last
              />
            </View>

            <Text style={styles.sectionTitle}>Service Address</Text>
            <View style={styles.card}>
              {chosenLocation ? (
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressLabel}>{chosenLocation.label}</Text>
                    {chosenLocation.address ? (
                      <Text style={styles.addressText}>{chosenLocation.address}</Text>
                    ) : null}
                    {chosenLocation.area ? (
                      <Text style={styles.addressText}>{areaLabel(chosenLocation.area)}</Text>
                    ) : null}
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyNote}>No location selected.</Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>Describe the problem</Text>
            <InputField
              label=""
              placeholder="e.g. AC not cooling, strange noise…"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={{ minHeight: 84, textAlignVertical: 'top' }}
            />
          </>
        )}
      </ScrollView>

      {/* Footer navigation */}
      <View style={styles.footer}>
        {step > 0 && (
          <Button
            label="Back"
            variant="secondary"
            onPress={() => setStep((s) => s - 1)}
            style={{ flex: 1 }}
          />
        )}
        {step < 2 ? (
          <Button
            label="Continue"
            onPress={() => setStep((s) => s + 1)}
            disabled={!canContinue}
            style={{ flex: 1 }}
          />
        ) : (
          <Button
            label="Confirm Booking"
            onPress={handleConfirm}
            loading={submitting}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.sumRow, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={styles.sumValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  successRoot: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  successCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.completed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: { ...typography.h2, textAlign: 'center' },
  successSub: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  offerBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
    alignSelf: 'stretch',
  },
  offerText: { ...typography.bodySecondary, textAlign: 'center' },
  offerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginTop: spacing.md,
  },
  offerItemText: { ...typography.body, fontWeight: '700' },
  successActions: { alignSelf: 'stretch', marginTop: spacing.xl },
  container: { padding: spacing.lg, paddingBottom: 110 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, outlineStyle: 'none' } as any,

  sectionTitle: { ...typography.h3, marginBottom: spacing.md },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  tile: {
    width: '31%',
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
  },
  tileOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  tileLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  tileLabelOn: { color: colors.primary },

  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  locRowOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  locLabel: { ...typography.body, fontWeight: '600' },
  locLabelOn: { color: colors.primary },
  locAddress: { ...typography.caption, marginTop: 1 },
  locArea: { ...typography.caption, marginTop: 1 },

  searchBoxOpen: { borderColor: colors.primary, marginBottom: spacing.sm },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.primaryLight,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  dropdownHeader: {
    ...typography.caption,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  verifiedText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  provSpecialty: { ...typography.caption, marginTop: 1 },
  provRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  provRowOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 18 },
  provName: { ...typography.body, fontWeight: '700' },
  provRating: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  provRatingText: { ...typography.caption, fontWeight: '600' },
  provNoRating: { ...typography.caption, marginTop: 3 },

  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  slotOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  slotText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  slotTextOn: { color: colors.white },
  blockedNote: { ...typography.bodySecondary, color: colors.danger },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryService: { ...typography.body, fontWeight: '700' },
  summaryCategory: { ...typography.caption, marginTop: 1 },
  fieldHint: { ...typography.caption, marginTop: -8, marginBottom: spacing.sm },
  // Dimmed when the category comes from the chosen appliance.
  gridLocked: { opacity: 0.55 },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  choiceRowOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  choiceTitle: { ...typography.body, fontWeight: '600' },
  choiceTitleOn: { color: colors.primary },
  choiceSub: { ...typography.caption, marginTop: 1 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  dropdownText: { ...typography.body, fontWeight: '600' },
  dropdownPlaceholder: { color: colors.textMuted, fontWeight: '400' },
  dropdownSub: { ...typography.caption, marginTop: 1 },
  dropdownList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemText: { ...typography.body, fontWeight: '600' },
  sumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sumLabel: { ...typography.bodySecondary, flex: 1 },
  sumValue: { ...typography.body, fontWeight: '600' },
  addressRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  addressLabel: { ...typography.body, fontWeight: '700' },
  addressText: { ...typography.caption, marginTop: 1 },

  emptyNote: { ...typography.bodySecondary, marginBottom: spacing.md },
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  emptyBoxText: { ...typography.caption, flex: 1 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
