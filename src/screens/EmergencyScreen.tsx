import { useLanguage } from '@/i18n/LanguageContext';
// src/screens/EmergencyScreen.tsx
import ApplianceSelector from '@/components/ApplianceSelector';
import Button from '@/components/Button';
import SearchBar from '@/components/SearchBar';
import ServiceProgressTracker from '@/components/ServiceProgressTracker';
import Text from '@/components/app-text';
import { useAuth } from '@/context/AuthContext';
import { useAreaFilteredProviders } from '@/hooks/useAreaFilteredProviders';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import { createServiceRequest,fetchRequestsForHomeowner } from '@/services/requestService';
import { fetchReviewedJobIds } from '@/services/reviewService';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import { ProviderProfile,ServiceRequest } from '@/types';
import { applianceIcon,applianceLabel } from '@/utils/appliances';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect,useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React,{ useCallback,useMemo,useState } from 'react';
import {
ActivityIndicator,
Alert,
Modal,
Platform,
ScrollView,
StyleSheet,
TouchableOpacity,
View,
} from 'react-native';

export default function EmergencyScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  // Only providers who cover the homeowner's area.
  const { providers, loading, myAreas } = useAreaFilteredProviders();

  // Top-level view toggle: find help vs. track my requests.
  const [tab, setTab] = useState<'find' | 'requests'>('find');

  // My emergency requests
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([]);
  // Jobs already reviewed, so we don't offer to rate them twice.
  const [reviewedJobs, setReviewedJobs] = useState<string[]>([]);

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilter, setPendingFilter] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string[]>([]);
  const [hasFiltered, setHasFiltered] = useState(false);

  // Provider list + search
  const [search, setSearch] = useState('');

  // Provider detail modal
  const [selectedProvider, setSelectedProvider] = useState<ProviderProfile | null>(null);
  const [chosenAppliances, setChosenAppliances] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load the homeowner's emergency requests whenever the screen is focused.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      fetchRequestsForHomeowner(user.uid)
        .then((all) => setMyRequests(all.filter((r) => r.isEmergency)))
        .catch(() => {});
      fetchReviewedJobIds(user.uid)
        .then(setReviewedJobs)
        .catch(() => {});
    }, [user]),
  );

  function notify(msg: string) {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert(t('Emergency Request'), msg);
  }

  function togglePending(id: string) {
    setPendingFilter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function applyFilter() {
    setActiveFilter(pendingFilter);
    setHasFiltered(true);
    setFilterOpen(false);
  }

  // Providers who fix at least one of the selected appliances.
  const matchingProviders = useMemo(() => {
    let list = providers;
    if (activeFilter.length > 0) {
      list = list.filter((p) => (p.appliances ?? []).some((a) => activeFilter.includes(a)));
    }
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return list;
  }, [providers, activeFilter, search]);

  function openProvider(p: ProviderProfile) {
    setSelectedProvider(p);
    // Pre-select the appliances that overlap the homeowner's reported problems.
    const overlap = (p.appliances ?? []).filter((a) => activeFilter.includes(a));
    setChosenAppliances(overlap.length ? overlap : []);
  }

  function toggleChosen(id: string) {
    setChosenAppliances((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function sendRequest() {
    if (!user || !selectedProvider || chosenAppliances.length === 0) return;
    setSubmitting(true);
    try {
      const label = chosenAppliances.map((a) => t(applianceLabel(a))).join(', ');
      await createServiceRequest({
        homeownerId: user.uid,
        homeownerName: user.displayName ?? 'Homeowner',
        providerId: selectedProvider.uid,
        providerName: selectedProvider.name,
        maintenanceItemId: null,
        serviceType: `Emergency: ${label}`,
        category: 'custom',
        isEmergency: true,
        appliances: chosenAppliances,
      });
      setSelectedProvider(null);
      notify(t('Emergency request sent to {name}.', { name: selectedProvider.name }));
      // Refresh and show the homeowner their requests.
      if (user) {
        const all = await fetchRequestsForHomeowner(user.uid);
        setMyRequests(all.filter((r) => r.isEmergency));
      }
      setTab('requests');
    } catch (e) {
      console.log('emergency request failed:', e);
      notify(t('Could not send the request. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* Tab toggle: Find Help vs My Requests */}
      <View style={styles.tabToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, tab === 'find' && styles.toggleBtnActive]}
          onPress={() => setTab('find')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, tab === 'find' && styles.toggleTextActive]}>
            {t('Find Help')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, tab === 'requests' && styles.toggleBtnActive]}
          onPress={() => setTab('requests')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, tab === 'requests' && styles.toggleTextActive]}>
            {t('My Requests')} {myRequests.length ? ` (${myRequests.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'requests' ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {myRequests.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>{t('No emergency requests yet')}</Text>
              <Text style={styles.emptySub}>
                {t('Requests you send from "Find Help" will appear here with their status.')}
              </Text>
            </View>
          ) : (
            myRequests.map((req) => (
              <View key={req.id} style={styles.reqCard}>
                <View style={styles.reqHeader}>
                  <Text style={styles.reqTitle} numberOfLines={1}>
                    {(req.appliances ?? []).map(applianceIcon).join(' ')}
                    {'  '}
                    {(req.appliances ?? []).map((a) => t(applianceLabel(a))).join(', ')}
                  </Text>
                </View>
                <ServiceProgressTracker status={req.status} providerName={req.providerName} />

                {req.status === 'completed' && !reviewedJobs.includes(req.id) && (
                  <TouchableOpacity
                    style={styles.rateBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      const parent =
                        navigation.getParent<NativeStackNavigationProp<MainStackParamList>>();
                      (parent ?? navigation).navigate('WriteReview', {
                        providerId: req.providerId,
                        providerName: req.providerName,
                        jobId: req.id,
                        jobType: 'request',
                        serviceName: req.serviceType,
                      });
                    }}
                  >
                    <Ionicons name="star-outline" size={16} color={colors.white} />
                    <Text style={styles.rateBtnText}>{t('Rate this service')}</Text>
                  </TouchableOpacity>
                )}

                {req.status === 'completed' && reviewedJobs.includes(req.id) && (
                  <View style={styles.ratedRow}>
                    <Ionicons name="checkmark-circle" size={15} color={colors.completed} />
                    <Text style={styles.ratedText}>{t('You rated this service')}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <>
          {/* Top bar: filter summary + change button */}
          <View style={styles.topBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.topTitle}>{t('Find help fast')}</Text>
              <Text style={styles.topSub}>
                {activeFilter.length > 0
                  ? t('Showing providers for: {list}', { list: activeFilter.map((a) => t(applianceLabel(a))).join('، ') })
                  : t('Select the appliances that need fixing.')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => {
                setPendingFilter(activeFilter);
                setFilterOpen(true);
              }}
            >
              <Text style={styles.filterBtnText}>{t('Filter')}</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          {hasFiltered && (
            <View style={styles.searchRow}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder={t('Search provider name…')}
              />
            </View>
          )}

          {/* Provider list */}
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : !hasFiltered ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🚨</Text>
              <Text style={styles.emptyTitle}>{t("What's the emergency?")}</Text>
              <Text style={styles.emptySub}>
                {t('Tap Filter to pick the appliances that need fixing.')}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.listContent}>
              {matchingProviders.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="search-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('No providers found')}</Text>
                  <Text style={styles.emptySub}>
                    {myAreas.length > 0
                      ? t(
                          'No provider covering your area fixes those appliances. Try different appliances, or add another area in your profile.',
                        )
                      : t('No one currently fixes those appliances. Try different ones.')}
                  </Text>
                </View>
              ) : (
                matchingProviders.map((p) => (
                  <TouchableOpacity
                    key={p.uid}
                    style={styles.providerCard}
                    activeOpacity={0.85}
                    onPress={() => openProvider(p)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.providerName}>{p.name}</Text>
                      <Text style={styles.providerChips} numberOfLines={1}>
                        {(p.appliances ?? []).map(applianceIcon).join('  ')}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* ---- Filter popup ---- */}
      <Modal visible={filterOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('What needs fixing?')}</Text>
            <Text style={styles.modalSub}>{t('Select all appliances with a problem.')}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <ApplianceSelector selected={pendingFilter} onToggle={togglePending} />
            </ScrollView>
            <View style={styles.modalActions}>
              <Button
                label={t('Cancel')}
                variant="secondary"
                onPress={() => setFilterOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                label={`Filter${pendingFilter.length ? ` (${pendingFilter.length})` : ''}`}
                onPress={applyFilter}
                disabled={pendingFilter.length === 0}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ---- Provider detail: choose appliances + request ---- */}
      <Modal visible={!!selectedProvider} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {selectedProvider && (
              <>
                <Text style={styles.modalTitle}>{selectedProvider.name}</Text>
                <Text style={styles.modalSub}>
                  {t('Select the appliances you need this provider to fix.')}
                </Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  <View style={styles.detailGrid}>
                    {(selectedProvider.appliances ?? []).map((a) => {
                      const on = chosenAppliances.includes(a);
                      return (
                        <TouchableOpacity
                          key={a}
                          style={[styles.detailChip, on && styles.detailChipOn]}
                          onPress={() => toggleChosen(a)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.detailChipIcon}>{applianceIcon(a)}</Text>
                          <Text style={[styles.detailChipLabel, on && styles.detailChipLabelOn]}>
                            {t(applianceLabel(a))}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {selectedProvider.otherAppliance ? (
                    <Text style={styles.otherNote}>
                      {t('Also fixes:')} {selectedProvider.otherAppliance}
                    </Text>
                  ) : null}
                </ScrollView>
                <TouchableOpacity
                  style={styles.bookInstead}
                  onPress={() => {
                    const p = selectedProvider;
                    if (!p) return;
                    setSelectedProvider(null);
                    // Explicitly target the parent Stack navigator, which is
                    // where 'Booking' is registered (EmergencyScreen itself
                    // only lives inside the nested Tab navigator).
                    const parent =
                      navigation.getParent<NativeStackNavigationProp<MainStackParamList>>();
                    (parent ?? navigation).navigate('Booking', {
                      providerId: p.uid,
                      providerName: p.name,
                    });
                  }}
                >
                  <Text style={styles.bookInsteadText}>
                    {t('📅 Prefer a scheduled visit? Book a date & time')}
                  </Text>
                </TouchableOpacity>
                <View style={styles.modalActions}>
                  <Button
                    label={t('Close')}
                    variant="secondary"
                    onPress={() => setSelectedProvider(null)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label={t('Request Service')}
                    onPress={sendRequest}
                    loading={submitting}
                    disabled={chosenAppliances.length === 0}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  tabToggle: {
    flexDirection: 'row',
    margin: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: colors.surface },
  toggleText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  toggleTextActive: { color: colors.primary },
  reqCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  reqHeader: { marginBottom: 2 },
  reqTitle: { ...typography.body, fontWeight: '700' },
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
  ratedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  ratedText: { ...typography.caption, color: colors.completed, fontWeight: '600' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  topTitle: { ...typography.h2 },
  topSub: { ...typography.bodySecondary, marginTop: 2 },
  filterBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    marginLeft: spacing.md,
  },
  filterBtnText: { color: colors.white, fontWeight: '700' },
  searchRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  listContent: { padding: spacing.lg, paddingTop: spacing.sm },

  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 18 },
  providerName: { ...typography.body, fontWeight: '700' },
  providerChips: { fontSize: 14, marginTop: 3 },
  chevron: { fontSize: 24, color: colors.textMuted },

  empty: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIcon: { fontSize: 40, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h3 },
  emptySub: { ...typography.bodySecondary, textAlign: 'center', marginTop: spacing.xs },

  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: { ...typography.h2 },
  modalSub: { ...typography.bodySecondary, marginTop: 4, marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  bookInstead: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  bookInsteadText: { color: colors.primary, fontWeight: '700', fontSize: 13 },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  detailChipOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  detailChipIcon: { fontSize: 15, marginRight: 6 },
  detailChipLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  detailChipLabelOn: { color: colors.primary },
  otherNote: { ...typography.bodySecondary, marginTop: spacing.md, fontStyle: 'italic' },
});
