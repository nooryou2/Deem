import { useLanguage } from '@/i18n/LanguageContext';
// src/screens/provider/ProviderAreasScreen.tsx
//
// Where a provider defines their coverage: which areas they work in, and the
// map pin homeowners see. Split out from the profile so the lists have room.

import Button from '@/components/Button';
import MapPicker,{ LatLng } from '@/components/MapPicker';
import Text from '@/components/app-text';
import { useDialog } from '@/components/AppDialog';
import { useAuth } from '@/context/AuthContext';
import type { ProviderStackParamList } from '@/navigation/ProviderNavigator';
import { getProviderProfile,saveProviderServiceAreas } from '@/services/roleService';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import { areasByGovernorate,areasByIds,nearestArea } from '@/utils/areas';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useEffect,useMemo,useState } from 'react';
import {
ActivityIndicator,
ScrollView,
StyleSheet,
TextInput,
TouchableOpacity,
View,
} from 'react-native';

type Props = NativeStackScreenProps<ProviderStackParamList, 'ProviderAreas'>;

export default function ProviderAreasScreen({ navigation }: Props) {
  const { t, tp } = useLanguage();
  const dialog = useDialog();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [areas, setAreas] = useState<string[]>([]);
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [address, setAddress] = useState('');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    getProviderProfile(user.uid)
      .then((p) => {
        if (p) {
          setAreas(p.serviceAreas ?? []);
          setAddress(p.address ?? '');
          if (p.location) setCoords({ lat: p.location.lat, lng: p.location.lng });
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  function notify(msg: string) {
    dialog.alert(msg);
  }

  // Dropping a pin suggests the surrounding area — the provider still confirms,
  // since where they're based isn't necessarily all they cover.
  function handleCoords(next: LatLng) {
    setCoords(next);
    const match = nearestArea(next);
    if (match && !areas.includes(match.id)) {
      setAreas((prev) => [...prev, match.id]);
    }
  }

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = areasByGovernorate();
    if (!q) return all;
    return all
      .map((g) => ({ ...g, areas: g.areas.filter((a) => a.label.toLowerCase().includes(q)) }))
      .filter((g) => g.areas.length > 0);
  }, [query]);

  function toggleArea(id: string) {
    setAreas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleGovernorate(ids: string[], allOn: boolean) {
    setAreas((prev) =>
      allOn ? prev.filter((a) => !ids.includes(a)) : Array.from(new Set([...prev, ...ids])),
    );
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await saveProviderServiceAreas(
        user.uid,
        address,
        areas,
        coords ? { lat: coords.lat, lng: coords.lng } : null,
      );
      notify(t('Your coverage was saved.'));
      navigation.goBack();
    } catch {
      notify(t('Could not save. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>{t('Areas & Coverage')}</Text>
        <Text style={styles.pageSub}>
          {t('Manage the areas you cover and your service location.')}
        </Text>

        {/* Base location first: pinning it suggests the surrounding area, which
            gives the area list a sensible starting point. */}
        <View style={styles.card}>
          <View style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('Your base location')}</Text>
              <Text style={styles.cardSub}>
                {t('Where your office or workshop is. Tap the map to drop your pin.')}
              </Text>
            </View>
          </View>
          <MapPicker
            value={coords}
            onChange={handleCoords}
            highlightedAreas={areasByIds(areas)}
            height={230}
          />
          {coords ? (
            <Text style={styles.pinNote}>{t('Green circles show the areas you cover.')}</Text>
          ) : (
            <Text style={styles.pinNote}>
              {t("No pin set yet — homeowners won't see how far you are.")}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('Areas you cover')}</Text>
              <Text style={styles.cardSub}>
                {t("You'll only appear to homeowners in these areas.")}
              </Text>
            </View>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={t('Search areas…')}
              placeholderTextColor={colors.textMuted}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {groups.length === 0 && (
            <Text style={styles.noResults}>
              {t('No areas match "')}
              {query}".
            </Text>
          )}

          {groups.map((group) => {
            const ids = group.areas.map((a) => a.id);
            const chosen = ids.filter((id) => areas.includes(id));
            const allOn = chosen.length === ids.length && ids.length > 0;
            const isOpen = query ? true : expanded[group.governorate];

            return (
              <View key={group.governorate} style={styles.govBlock}>
                <View style={styles.govRow}>
                  <TouchableOpacity
                    onPress={() => toggleGovernorate(ids, allOn)}
                    hitSlop={6}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={
                        allOn ? 'checkbox' : chosen.length > 0 ? 'remove-circle' : 'square-outline'
                      }
                      size={22}
                      color={chosen.length > 0 ? colors.primary : colors.border}
                    />
                  </TouchableOpacity>

                  <Text style={styles.govName}>{group.governorate}</Text>
                  {chosen.length > 0 && !allOn && (
                    <View style={styles.countPill}>
                      <Text style={styles.countText}>{chosen.length}</Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }} />

                  <TouchableOpacity
                    style={styles.expandBtn}
                    activeOpacity={0.7}
                    onPress={() =>
                      setExpanded((e) => ({
                        ...e,
                        [group.governorate]: !e[group.governorate],
                      }))
                    }
                  >
                    <Text style={styles.expandText}>
                      {allOn ? t('All neighborhoods') : tp('areas', group.areas.length)}
                    </Text>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={15}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {isOpen && (
                  <View style={styles.areaList}>
                    {group.areas.map((a) => {
                      const on = areas.includes(a.id);
                      return (
                        <TouchableOpacity
                          key={a.id}
                          style={styles.areaRow}
                          activeOpacity={0.7}
                          onPress={() => toggleArea(a.id)}
                        >
                          <Ionicons
                            name={on ? 'checkbox' : 'square-outline'}
                            size={19}
                            color={on ? colors.primary : colors.border}
                          />
                          <Text style={[styles.areaName, on && styles.areaNameOn]}>
                            {t(a.label)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.tipBox}>
          <Ionicons name="bulb-outline" size={16} color="#B45309" />
          <Text style={styles.tipText}>
            {t('Being specific with your areas helps homeowners find you faster.')}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label={t('Save Coverage')} onPress={handleSave} loading={saving} />
      </View>
    </View>
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
  container: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: 110,
  },
  pageTitle: { ...typography.h2 },
  pageSub: { ...typography.bodySecondary, marginTop: 2, marginBottom: spacing.lg },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  cardTitle: { ...typography.h3 },
  stepRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  pinNote: { ...typography.caption, marginTop: spacing.sm },
  cardSub: { ...typography.caption, marginTop: 2, marginBottom: spacing.md },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, outlineStyle: 'none' } as any,
  noResults: { ...typography.caption, paddingVertical: spacing.md },

  govBlock: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  govRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  govName: { ...typography.body, fontWeight: '700' },
  countPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  countText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandText: { ...typography.caption },

  areaList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 9 },
  areaName: { ...typography.body },
  areaNameOn: { color: colors.primary, fontWeight: '600' },

  tipBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  tipText: { flex: 1, fontSize: 12, color: '#8A5A0B', lineHeight: 18 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
