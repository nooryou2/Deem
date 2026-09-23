import { useLanguage } from '@/i18n/LanguageContext';
import { fmtNumber } from '@/i18n/locale';
// src/screens/ProvidersScreen.tsx
//
// A browsable directory of the service providers who cover the homeowner's
// areas, with search, sorting, and distance from their saved location.

import StarRating from '@/components/StarRating';
import Text from '@/components/app-text';
import { useAuth } from '@/context/AuthContext';
import { useAreaFilteredProviders } from '@/hooks/useAreaFilteredProviders';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import { getSavedLocations } from '@/services/roleService';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import { ProviderProfile,SavedLocation } from '@/types';
import { APPLIANCES,applianceIcon,applianceLabel } from '@/utils/appliances';
import { areaLabel,distanceKm } from '@/utils/areas';
import { Ionicons } from '@expo/vector-icons';
import DirectionalArrow from '@/components/DirectionalArrow';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useCallback,useMemo,useState } from 'react';
import {
ActivityIndicator,
FlatList,
Modal,
ScrollView,
StyleSheet,
TextInput,
TouchableOpacity,
View,
} from 'react-native';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainStackParamList, 'Providers'>,
  NativeStackScreenProps<MainStackParamList>
>;

type SortKey = 'best' | 'rating' | 'distance';

// Minimum-rating options. Zero means "no filter", so tapping an active chip
// clears it rather than leaving the user stuck with a filter on.
const RATING_FILTERS: { value: number; label: string }[] = [
  { value: 4, label: '4+ stars' },
  { value: 3, label: '3+ stars' },
];

// Distance thresholds in km.
const DISTANCE_FILTERS = [5, 10, 25];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'best', label: 'Best Match' },
  { key: 'rating', label: 'Top Rated' },
  { key: 'distance', label: 'Nearest' },
];

/** A provider plus the distance from the homeowner, when both are known. */
type RankedProvider = ProviderProfile & { distance: number | null };

export default function ProvidersScreen({ navigation }: Props) {
  const { t, tp } = useLanguage();
  const { user } = useAuth();
  const { providers, loading } = useAreaFilteredProviders();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('best');
  const [minStars, setMinStars] = useState(0);
  // Appliance ids the provider must cover; empty means no service filter.
  const [services, setServices] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  // Which dropdown is open, if any.
  const [openMenu, setOpenMenu] = useState<
    'sort' | 'filters' | 'services' | 'rating' | 'distance' | null
  >(null);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [homeId, setHomeId] = useState<string | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  // Distances are measured from whichever saved place the user has chosen.
  const home = locations.find((l) => l.id === homeId) ?? null;

  // Reloads on focus so a location added from the picker appears right away.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      getSavedLocations(user.uid)
        .then((list) => {
          setLocations(list);
          setHomeId((current) =>
            current && list.some((l) => l.id === current)
              ? current
              : ((list.find((l) => l.isDefault) ?? list[0])?.id ?? null),
          );
        })
        .catch(() => {});
    }, [user]),
  );

  const ranked: RankedProvider[] = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list: RankedProvider[] = providers.map((p) => ({
      ...p,
      distance:
        home && p.location ? distanceKm(home, { lat: p.location.lat, lng: p.location.lng }) : null,
    }));

    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.appliances ?? []).some((a) => applianceLabel(a).toLowerCase().includes(q)),
      );
    }

    if (services.length > 0) {
      // Match providers who cover any of the chosen services.
      list = list.filter((p) => (p.appliances ?? []).some((a) => services.includes(a)));
    }

    if (minStars > 0) {
      list = list.filter((p) => (p.rating?.averageStars ?? 0) >= minStars);
    }

    if (maxDistance != null) {
      // Providers without a pinned location have no distance, so they can't
      // satisfy a distance filter and are excluded.
      list = list.filter((p) => p.distance != null && p.distance <= maxDistance);
    }

    const byRating = (a: RankedProvider, b: RankedProvider) =>
      (b.rating?.averageStars ?? 0) - (a.rating?.averageStars ?? 0);

    const byDistance = (a: RankedProvider, b: RankedProvider) => {
      // Providers with no pinned location sort last rather than first.
      if (a.distance == null && b.distance == null) return 0;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    };

    if (sort === 'rating') list.sort(byRating);
    else if (sort === 'distance') list.sort(byDistance);
    else {
      // Best match balances reputation and proximity: rating leads, distance
      // breaks ties so a nearby equal-rated provider comes first.
      list.sort((a, b) => byRating(a, b) || byDistance(a, b));
    }

    return list;
  }, [providers, query, sort, minStars, maxDistance, services, home]);

  const activeFilterCount =
    (minStars > 0 ? 1 : 0) + (maxDistance != null ? 1 : 0) + (services.length > 0 ? 1 : 0);

  const topRatedId = useMemo(() => {
    const rated = providers.filter((p) => (p.rating?.count ?? 0) > 0);
    if (rated.length === 0) return null;
    return rated.reduce((best, p) =>
      (p.rating?.averageStars ?? 0) > (best.rating?.averageStars ?? 0) ? p : best,
    ).uid;
  }, [providers]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('Search providers or services…')}
            placeholderTextColor={colors.textMuted}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Count on the left, current sort on the right. */}
        {/* Distances are relative, so make the reference point explicit and
            let the user switch it. */}
        {locations.length > 0 && (
          <View style={styles.homeBar}>
            <Ionicons name="location" size={15} color={colors.primary} />
            <Text style={styles.homeBarText} numberOfLines={1}>
              {t('Distance from:')}
              <Text style={styles.homeBarName}>{home?.label ?? '—'}</Text>
            </Text>
            {locations.length > 1 && (
              <TouchableOpacity onPress={() => setLocationPickerOpen(true)} hitSlop={8}>
                <Text style={styles.homeBarChange}>{t('Change')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.count}>
            {tp('providersFound', ranked.length)}
          </Text>
          <TouchableOpacity
            style={styles.sortTrigger}
            onPress={() => setOpenMenu((m) => (m === 'sort' ? null : 'sort'))}
            activeOpacity={0.7}
          >
            <Text style={styles.sortTriggerText}>
              {t('Sort by:')} {t(SORTS.find((x) => x.key === sort)?.label ?? '')}
            </Text>
            <Ionicons
              name={openMenu === 'sort' ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Filter pills on one scrollable line, so adding more filters later
            doesn't push the list further down the screen. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillScroll}
          contentContainerStyle={styles.pillRow}
        >
          <TouchableOpacity
            style={[styles.pill, activeFilterCount > 0 && styles.pillActive]}
            onPress={() => setOpenMenu((m) => (m === 'filters' ? null : 'filters'))}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={15} color={colors.textPrimary} />
            <Text style={styles.pillText}>
              {t('Filters')} {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, services.length > 0 && styles.pillActive]}
            onPress={() => setOpenMenu((m) => (m === 'services' ? null : 'services'))}
            activeOpacity={0.7}
          >
            <Text style={styles.pillText}>
              {services.length === 0
                ? t('Service')
                : services.length === 1
                  ? t(applianceLabel(services[0]))
                  : tp('services', services.length)}
            </Text>
            <Ionicons
              name={openMenu === 'services' ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, minStars > 0 && styles.pillActive]}
            onPress={() => setOpenMenu((m) => (m === 'rating' ? null : 'rating'))}
            activeOpacity={0.7}
          >
            <Text style={styles.pillText}>{minStars > 0 ? t('{count}+ stars', { count: minStars }) : t('Rating')}</Text>
            <Ionicons
              name={openMenu === 'rating' ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, maxDistance != null && styles.pillActive]}
            onPress={() => setOpenMenu((m) => (m === 'distance' ? null : 'distance'))}
            activeOpacity={0.7}
          >
            <Text style={styles.pillText}>
              {maxDistance != null ? `Within ${maxDistance} km` : t('Distance')}
            </Text>
            <Ionicons
              name={openMenu === 'distance' ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </ScrollView>

        {/* --- Menus --- */}
        {openMenu === 'sort' && (
          <View style={styles.menu}>
            {SORTS.map((s) => (
              <MenuRow
                key={s.key}
                label={t(s.label)}
                selected={sort === s.key}
                onPress={() => {
                  setSort(s.key);
                  setOpenMenu(null);
                }}
              />
            ))}
          </View>
        )}

        {openMenu === 'services' && (
          <ScrollView style={styles.menu} nestedScrollEnabled>
            <MenuRow
              label={t('Any service')}
              selected={services.length === 0}
              onPress={() => setServices([])}
            />
            {APPLIANCES.map((a) => {
              const on = services.includes(a.id);
              return (
                <MenuRow
                  key={a.id}
                  label={`${applianceIcon(a.id)}  ${t(a.label)}`}
                  selected={on}
                  // Multi-select: tapping toggles rather than replacing.
                  onPress={() =>
                    setServices((prev) => (on ? prev.filter((x) => x !== a.id) : [...prev, a.id]))
                  }
                />
              );
            })}
          </ScrollView>
        )}

        {openMenu === 'rating' && (
          <View style={styles.menu}>
            <MenuRow
              label={t('Any rating')}
              selected={minStars === 0}
              onPress={() => {
                setMinStars(0);
                setOpenMenu(null);
              }}
            />
            {RATING_FILTERS.map((f) => (
              <MenuRow
                key={f.value}
                label={t(f.label)}
                selected={minStars === f.value}
                onPress={() => {
                  setMinStars(f.value);
                  setOpenMenu(null);
                }}
              />
            ))}
          </View>
        )}

        {openMenu === 'distance' && (
          <View style={styles.menu}>
            <MenuRow
              label={t('Any distance')}
              selected={maxDistance == null}
              onPress={() => {
                setMaxDistance(null);
                setOpenMenu(null);
              }}
            />
            {DISTANCE_FILTERS.map((d) => (
              <MenuRow
                key={d}
                label={`Within ${d} km`}
                selected={maxDistance === d}
                onPress={() => {
                  setMaxDistance(d);
                  setOpenMenu(null);
                }}
              />
            ))}
          </View>
        )}

        {openMenu === 'filters' && (
          <ScrollView style={styles.menu} nestedScrollEnabled>
            <Text style={styles.menuHeading}>{t('Service')}</Text>
            <MenuRow
              label={t('Any service')}
              selected={services.length === 0}
              onPress={() => setServices([])}
            />
            {APPLIANCES.map((a) => {
              const on = services.includes(a.id);
              return (
                <MenuRow
                  key={a.id}
                  label={`${applianceIcon(a.id)}  ${t(a.label)}`}
                  selected={on}
                  onPress={() =>
                    setServices((prev) => (on ? prev.filter((x) => x !== a.id) : [...prev, a.id]))
                  }
                />
              );
            })}

            <Text style={[styles.menuHeading, { marginTop: spacing.md }]}>
              {t('Minimum rating')}
            </Text>
            <MenuRow
              label={t('Any rating')}
              selected={minStars === 0}
              onPress={() => setMinStars(0)}
            />
            {RATING_FILTERS.map((f) => (
              <MenuRow
                key={f.value}
                label={t(f.label)}
                selected={minStars === f.value}
                onPress={() => setMinStars(f.value)}
              />
            ))}

            <Text style={[styles.menuHeading, { marginTop: spacing.md }]}>{t('Distance')}</Text>
            <MenuRow
              label={t('Any distance')}
              selected={maxDistance == null}
              onPress={() => setMaxDistance(null)}
            />
            {DISTANCE_FILTERS.map((d) => (
              <MenuRow
                key={d}
                label={`Within ${d} km`}
                selected={maxDistance === d}
                onPress={() => setMaxDistance(d)}
              />
            ))}

            {activeFilterCount > 0 && (
              <TouchableOpacity
                style={styles.clearAll}
                onPress={() => {
                  setMinStars(0);
                  setMaxDistance(null);
                  setServices([]);
                }}
              >
                <Text style={styles.clearAllText}>{t('Clear all filters')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>

      {/* Location picker */}
      <Modal visible={locationPickerOpen} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setLocationPickerOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{t('Choose location')}</Text>
              <View style={{ width: 22 }} />
            </View>

            {locations.map((loc) => {
              const on = loc.id === homeId;
              return (
                <TouchableOpacity
                  key={loc.id}
                  style={styles.sheetRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setHomeId(loc.id);
                    setLocationPickerOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sheetRowName, on && styles.sheetRowNameOn]}>
                      {t(loc.label)}
                    </Text>
                    {loc.area ? (
                      <Text style={styles.sheetRowArea}>{areaLabel(loc.area)}</Text>
                    ) : null}
                  </View>
                  {on && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.sheetAdd}
              activeOpacity={0.7}
              onPress={() => {
                setLocationPickerOpen(false);
                navigation.navigate('SetLocation', {});
              }}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={styles.sheetAddText}>{t('Add a new location')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FlatList
        data={ranked}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const services = (item.appliances ?? [])
            .slice(0, 3)
            .map((a) => t(applianceLabel(a)))
            .join(', ');
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('ProviderDetail', {
                  provider: item,
                  distance: item.distance,
                })
              }
            >
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.uid === topRatedId && (
                      <View style={styles.topPill}>
                        <Text style={styles.topPillText}>{t('Top Rated')}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.statsRow}>
                    {item.rating && item.rating.count > 0 ? (
                      <>
                        <StarRating value={item.rating.averageStars} readonly size={13} />
                        <Text style={styles.statText}>
                          {fmtNumber(Number(item.rating.averageStars.toFixed(1)))} ({fmtNumber(item.rating.count)})
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.statText}>{t('No reviews yet')}</Text>
                    )}
                    {item.distance != null && (
                      <>
                        <Ionicons
                          name="location-outline"
                          size={13}
                          color={colors.textMuted}
                          style={{ marginStart: spacing.sm }}
                        />
                        <Text style={styles.statText}>
                          {item.distance < 1
                            ? t('{distance} m away', { distance: Math.round(item.distance * 1000) })
                            : t('{distance} km away', { distance: Number(item.distance.toFixed(1)) })}
                        </Text>
                      </>
                    )}
                  </View>

                  <Text style={styles.services} numberOfLines={1}>
                    {services || t('General home services')}
                  </Text>
                </View>

                <DirectionalArrow kind="forward" shape="chevron" size={20} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('No providers found')}</Text>
            <Text style={styles.emptySub}>
              {query || activeFilterCount > 0
                ? t('Try clearing your search or filters.')
                : t(
                    'No providers cover your area yet. You can add another area from your profile.',
                  )}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function MenuRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { t, tp } = useLanguage();
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.menuRowText, selected && styles.menuRowTextOn]}>{t(label)}</Text>
      {selected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
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
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, outlineStyle: 'none' } as any,
  homeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    marginTop: spacing.md,
  },
  homeBarText: { ...typography.caption, flex: 1 },
  homeBarName: { fontWeight: '700', color: colors.textPrimary },
  homeBarChange: { color: colors.primary, fontWeight: '700', fontSize: 12 },

  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  sheetTitle: { ...typography.h3 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sheetRowName: { ...typography.body, fontWeight: '700' },
  sheetRowNameOn: { color: colors.primary },
  sheetRowArea: { ...typography.caption, marginTop: 2 },
  sheetAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sheetAddText: { color: colors.primary, fontWeight: '700', fontSize: 14 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  sortTrigger: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortTriggerText: { ...typography.caption, fontWeight: '600', color: colors.textPrimary },

  pillScroll: { flexGrow: 0, marginTop: spacing.md },
  pillRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  // A filled tint marks a pill whose filter is currently narrowing the list.
  pillActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  pillText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },

  menu: {
    maxHeight: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
    ...shadow.card,
  },
  menuHeading: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  menuRowText: { ...typography.body },
  menuRowTextOn: { color: colors.primary, fontWeight: '700' },
  clearAll: {
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  clearAllText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  count: { ...typography.caption, fontWeight: '600' },

  listContent: { padding: spacing.lg, paddingTop: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 22 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.body, fontWeight: '700', flexShrink: 1 },
  topPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  topPillText: { color: '#B45309', fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  statText: { ...typography.caption },
  services: { ...typography.caption, marginTop: 4 },

  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { ...typography.h3, marginTop: spacing.sm },
  emptySub: {
    ...typography.bodySecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
