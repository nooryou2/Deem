import { useLanguage } from '@/i18n/LanguageContext';
// src/screens/SetLocationScreen.tsx
//
// Delivery-app style location picker (à la Talabat): drop a pin on the map,
// use your current location, and add a written address for the technician.

import Button from '@/components/Button';
import InputField from '@/components/InputField';
import MapPicker,{ LatLng } from '@/components/MapPicker';
import Text from '@/components/app-text';
import { useDialog } from '@/components/AppDialog';
import { useAuth } from '@/context/AuthContext';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import { getSavedLocations,saveSavedLocations } from '@/services/roleService';
import { colors,radius,shadow,spacing,typography } from '@/theme/theme';
import { MAX_SAVED_LOCATIONS,SavedLocation } from '@/types';
import { AREAS,areaLabel,nearestArea } from '@/utils/areas';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,{ useEffect,useState } from 'react';
import { ScrollView,StyleSheet,TouchableOpacity,View } from 'react-native';

type Props = NativeStackScreenProps<MainStackParamList, 'SetLocation'>;

export default function SetLocationScreen({ navigation, route }: Props) {
  const { t } = useLanguage();
  const dialog = useDialog();
  const { user } = useAuth();
  const editingId = route.params?.locationId ?? null;
  const [label, setLabel] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [address, setAddress] = useState('');
  const [existing, setExisting] = useState<SavedLocation[]>([]);
  const [area, setArea] = useState<string>('');
  const [areaQuery, setAreaQuery] = useState('');
  const [showAreaList, setShowAreaList] = useState(false);
  const [saving, setSaving] = useState(false);
  // True when the area was filled in from the pin rather than chosen by hand.
  const [areaAutoPicked, setAreaAutoPicked] = useState(false);

  // Dropping a pin auto-selects the closest area, so the user rarely has to
  // pick one manually. They can still override it from the list below.
  function handleCoordsChange(next: LatLng) {
    setCoords(next);
    const match = nearestArea(next);
    if (match) {
      setArea(match.id);
      setAreaAutoPicked(true);
    }
  }

  useEffect(() => {
    if (!user) return;
    getSavedLocations(user.uid).then((list) => {
      setExisting(list);
      if (editingId) {
        const found = list.find((l) => l.id === editingId);
        if (found) {
          setLabel(found.label);
          setCoords({ lat: found.lat, lng: found.lng });
          setAddress(found.address ?? '');
          setArea(found.area ?? '');
        }
      }
    });
  }, [user, editingId]);

  function notify(msg: string) {
    dialog.alert(msg);
  }

  async function handleSave() {
    if (!user) return;
    if (!coords) {
      notify(t('Please drop a pin on the map first.'));
      return;
    }
    if (!area) {
      notify(t('Please choose the area your home is in.'));
      return;
    }
    if (!label.trim()) {
      notify(t('Please give this place a name, e.g. Home or Chalet.'));
      return;
    }

    setSaving(true);
    try {
      const entry: SavedLocation = {
        id: editingId ?? `loc_${Date.now()}`,
        label: label.trim(),
        lat: coords.lat,
        lng: coords.lng,
        address: address.trim(),
        area,
        // The very first place saved becomes the default.
        isDefault: editingId
          ? (existing.find((l) => l.id === editingId)?.isDefault ?? false)
          : existing.length === 0,
      };

      const next = editingId
        ? existing.map((l) => (l.id === editingId ? entry : l))
        : [...existing, entry];

      if (next.length > MAX_SAVED_LOCATIONS) {
        notify(t('You can save up to {max} locations.', { max: MAX_SAVED_LOCATIONS }));
        setSaving(false);
        return;
      }

      await saveSavedLocations(user.uid, next);
      notify(editingId ? 'Location updated.' : 'Location saved.');
      navigation.goBack();
    } catch (e) {
      console.log('save location failed:', e);
      notify(t('Could not save your location. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  const filteredAreas = areaQuery.trim()
    ? AREAS.filter((a) => a.label.toLowerCase().includes(areaQuery.trim().toLowerCase()))
    : AREAS;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{editingId ? t('Edit location') : t('Add a location')}</Text>
      <Text style={styles.subtitle}>
        {t('Drop a pin so technicians know exactly where to come.')}
      </Text>

      <Text style={[styles.label, { marginTop: spacing.md }]}>{t('Name this place')}</Text>
      <InputField
        label=""
        placeholder={t('Home, Chalet, Office…')}
        value={label}
        onChangeText={setLabel}
      />

      <MapPicker value={coords} onChange={handleCoordsChange} height={280} />

      {/* Area — still needed for matching providers to this home */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{t('Area')}</Text>
        {areaAutoPicked && (
          <View style={styles.autoPill}>
            <Ionicons name="sparkles" size={11} color={colors.primary} />
            <Text style={styles.autoText}>{t('From your pin')}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.areaField}
        activeOpacity={0.7}
        onPress={() => setShowAreaList((v) => !v)}
      >
        <Ionicons name="location-outline" size={18} color={colors.textMuted} />
        <Text style={[styles.areaValue, !area && styles.areaPlaceholder]}>
          {area ? areaLabel(area) : t('Choose your area')}
        </Text>
        <Ionicons
          name={showAreaList ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {showAreaList && (
        <View style={styles.areaList}>
          <InputField
            label=""
            placeholder={t('Search areas…')}
            value={areaQuery}
            onChangeText={setAreaQuery}
          />
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
            {filteredAreas.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.areaRow}
                onPress={() => {
                  setArea(a.id);
                  setAreaAutoPicked(false);
                  setShowAreaList(false);
                  setAreaQuery('');
                }}
              >
                <Text style={styles.areaRowText}>{t(a.label)}</Text>
                <Text style={styles.areaRowGov}>{a.governorate}</Text>
              </TouchableOpacity>
            ))}
            {filteredAreas.length === 0 && (
              <Text style={styles.noMatch}>
                {t('No areas match "')}
                {areaQuery}".
              </Text>
            )}
          </ScrollView>
        </View>
      )}

      <Text style={styles.label}>{t('Address details')}</Text>
      <InputField
        label=""
        placeholder={t('Building 123, Road 45, Flat 2')}
        value={address}
        onChangeText={setAddress}
        multiline
        numberOfLines={2}
        style={{ minHeight: 64, textAlignVertical: 'top' }}
      />

      <Button
        label={editingId ? 'Update Location' : 'Save Location'}
        onPress={handleSave}
        loading={saving}
        style={{ marginTop: spacing.md }}
      />
    </ScrollView>
  );
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
  title: { ...typography.h2 },
  subtitle: { ...typography.bodySecondary, marginTop: 2, marginBottom: spacing.md },
  label: { ...typography.bodySecondary, fontWeight: '700' },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  autoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  autoText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  areaField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    backgroundColor: colors.surface,
  },
  areaValue: { flex: 1, ...typography.body },
  areaPlaceholder: { color: colors.textMuted },
  areaList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  areaRowText: { ...typography.body },
  areaRowGov: { ...typography.caption },
  noMatch: { ...typography.bodySecondary, paddingVertical: spacing.md },
});
