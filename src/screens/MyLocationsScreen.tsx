// src/screens/MyLocationsScreen.tsx
//
// Lists the homeowner's saved places (Home, Chalet, Office…), up to a maximum
// of five. Each entry pins a spot on the map and belongs to an area, which is
// what decides which providers they can see.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { getSavedLocations, saveSavedLocations } from '@/services/roleService';
import { areaLabel } from '@/utils/areas';
import Button from '@/components/Button';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';
import { SavedLocation, MAX_SAVED_LOCATIONS } from '@/types';
import type { MainStackParamList } from '@/navigation/MainNavigator';

type Props = NativeStackScreenProps<MainStackParamList, 'MyLocations'>;

export default function MyLocationsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    getSavedLocations(user.uid)
      .then(setLocations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(load);

  function notify(msg: string) {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Locations', msg);
  }

  async function persist(next: SavedLocation[]) {
    if (!user) return;
    setBusy(true);
    try {
      await saveSavedLocations(user.uid, next);
      setLocations(next);
    } catch (e) {
      console.log('save locations failed:', e);
      notify('Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(loc: SavedLocation) {
    const msg = `Remove "${loc.label}"?`;
    const doDelete = () => {
      const next = locations.filter((l) => l.id !== loc.id);
      // If we removed the default, promote the first remaining one.
      if (loc.isDefault && next.length > 0) next[0] = { ...next[0], isDefault: true };
      persist(next);
    };
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doDelete();
      return;
    }
    Alert.alert('Remove location?', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doDelete },
    ]);
  }

  function makeDefault(loc: SavedLocation) {
    persist(locations.map((l) => ({ ...l, isDefault: l.id === loc.id })));
  }

  const atLimit = locations.length >= MAX_SAVED_LOCATIONS;

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
        <Text style={styles.intro}>
          Save up to {MAX_SAVED_LOCATIONS} places so you can pick where you need service.
        </Text>

        {locations.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No locations saved</Text>
            <Text style={styles.emptySub}>
              Add your home so technicians know where to come.
            </Text>
          </View>
        ) : (
          locations.map((loc) => (
            <View key={loc.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardMain}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('SetLocation', { locationId: loc.id })
                }
              >
                <View style={styles.pinIcon}>
                  <Ionicons name="location" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>{loc.label}</Text>
                    {loc.isDefault && (
                      <View style={styles.defaultPill}>
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                  {loc.area ? (
                    <Text style={styles.area}>{areaLabel(loc.area)}</Text>
                  ) : null}
                  {loc.address ? (
                    <Text style={styles.address} numberOfLines={1}>
                      {loc.address}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.cardActions}>
                {!loc.isDefault && (
                  <TouchableOpacity onPress={() => makeDefault(loc)} disabled={busy}>
                    <Text style={styles.actionLink}>Set as default</Text>
                  </TouchableOpacity>
                )}
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => confirmDelete(loc)} disabled={busy}>
                  <Text style={styles.deleteLink}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {atLimit && (
          <Text style={styles.limitNote}>
            You've reached the {MAX_SAVED_LOCATIONS}-location limit. Remove one to add another.
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={atLimit ? `Limit of ${MAX_SAVED_LOCATIONS} reached` : 'Add a Location'}
          onPress={() => navigation.navigate('SetLocation', {})}
          disabled={atLimit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: 110 },
  intro: { ...typography.bodySecondary, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  pinIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.body, fontWeight: '700' },
  defaultPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  defaultText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  area: { ...typography.caption, marginTop: 2 },
  address: { ...typography.caption, marginTop: 1 },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  actionLink: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  deleteLink: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { ...typography.h3, marginTop: spacing.sm },
  emptySub: { ...typography.bodySecondary, marginTop: spacing.xs, textAlign: 'center' },
  limitNote: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
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
