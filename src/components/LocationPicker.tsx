import { useLanguage } from '@/i18n/LanguageContext';
import { fmtNumber } from '@/i18n/locale';
import Text from '@/components/app-text';
// src/components/LocationPicker.tsx
//
// Picks which of the homeowner's saved places a job is for. Used by both the
// booking flow and the add-appliance form so the choice looks the same in both.

import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { getSavedLocations } from '@/services/roleService';
import { areaLabel } from '@/utils/areas';
import MapPicker from '@/components/MapPicker';
import { colors, radius, spacing, typography } from '@/theme/theme';
import { SavedLocation } from '@/types';
import type { MainStackParamList } from '@/navigation/MainNavigator';

interface Props {
  value: string | null;
  onChange: (locationId: string | null) => void;
  /** Called with the loaded list, so a parent can react to "none saved yet". */
  onLoaded?: (locations: SavedLocation[]) => void;
  /** Shows the "See on map" shortcut above the list. */
  showMapLink?: boolean;
}

export default function LocationPicker({ value, onChange, onLoaded, showMapLink = true }: Props) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  // Reloads on focus so a place added mid-flow appears on return.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      getSavedLocations(user.uid)
        .then((list) => {
          setLocations(list);
          onLoaded?.(list);
          // Pre-select the default so the common case needs no extra tap.
          if (list.length > 0) {
            const stillValid = value && list.some((l) => l.id === value);
            if (!stillValid) {
              onChange((list.find((l) => l.isDefault) ?? list[0]).id);
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]),
  );

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />;
  }

  return (
    <View>
      {showMapLink && locations.length > 0 && (
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.mapLink}
            activeOpacity={0.7}
            onPress={() => setMapOpen(true)}
          >
            <Ionicons name="map-outline" size={15} color={colors.primary} />
            <Text style={styles.mapLinkText}>{t('See on map')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {locations.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="location-outline" size={22} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('No saved locations yet')}</Text>
          <Text style={styles.emptyText}>
            {t('Add the place you need service so the technician knows where to come.')}
          </Text>
        </View>
      ) : (
        locations.map((loc) => {
          const on = value === loc.id;
          return (
            <View key={loc.id} style={[styles.row, on && styles.rowOn]}>
              <TouchableOpacity
                style={styles.rowMain}
                activeOpacity={0.7}
                onPress={() => onChange(loc.id)}
              >
                <Ionicons
                  name={on ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={on ? colors.primary : colors.border}
                />
                <Ionicons
                  name="home-outline"
                  size={22}
                  color={on ? colors.primary : colors.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, on && styles.nameOn]}>{loc.label}</Text>
                  {loc.area ? <Text style={styles.area}>{areaLabel(loc.area)}</Text> : null}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuBtn}
                hitSlop={8}
                onPress={() => setMenuFor(menuFor === loc.id ? null : loc.id)}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {menuFor === loc.id && (
                <View style={styles.menu}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuFor(null);
                      navigation.navigate('SetLocation', { locationId: loc.id });
                    }}
                  >
                    <Ionicons name="pencil-outline" size={15} color={colors.textPrimary} />
                    <Text style={styles.menuItemText}>{t('Edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuFor(null);
                      navigation.navigate('MyLocations');
                    }}
                  >
                    <Ionicons name="list-outline" size={15} color={colors.textPrimary} />
                    <Text style={styles.menuItemText}>{t('Manage all')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}

      {/* All saved places at once, so the choice can be made spatially. */}
      <Modal visible={mapOpen} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setMapOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{t('Your locations')}</Text>
              <View style={{ width: 22 }} />
            </View>

            <Text style={styles.sheetHint}>{t('Tap a pin to choose that location.')}</Text>

            <MapPicker
              value={null}
              onChange={() => {}}
              readonly
              height={320}
              markers={locations.map((l) => ({
                id: l.id,
                label: l.label,
                lat: l.lat,
                lng: l.lng,
              }))}
              onMarkerPress={(id) => {
                onChange(id);
                setMapOpen(false);
              }}
            />

            <Text style={styles.sheetCount}>
              {t('Saved locations')}: {fmtNumber(locations.length)}
            </Text>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.addRow}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('SetLocation', {})}
      >
        <View style={{ flex: 1 }} />
        <Ionicons name="add" size={17} color={colors.primary} />
        <Text style={styles.addText}>{t('New Location')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapLinkText: { color: colors.primary, fontWeight: '700', fontSize: 13 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  rowOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  name: { ...typography.body, fontWeight: '600' },
  nameOn: { color: colors.primary },
  area: { ...typography.caption, marginTop: 1 },
  menuBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },

  menu: {
    position: 'absolute',
    end: spacing.sm,
    top: '100%',
    zIndex: 20,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    minWidth: 150,
    shadowColor: '#3D2E1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  menuItemText: { ...typography.body, fontSize: 14 },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
  },
  addText: { color: colors.primary, fontWeight: '700', fontSize: 14 },

  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sheetTitle: { ...typography.h3 },
  sheetHint: { ...typography.caption, marginBottom: spacing.md },
  sheetCount: { ...typography.caption, textAlign: 'center', marginTop: spacing.md },
  emptyBox: {
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  emptyTitle: { ...typography.body, fontWeight: '700' },
  emptyText: { ...typography.caption, textAlign: 'center' },
});
