// src/components/LocationPicker.tsx
//
// Lets the homeowner say which of their saved places an appliance lives at.
// Purely organisational — provider matching still uses all of their areas.

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { getSavedLocations } from '@/services/roleService';
import { areaLabel } from '@/utils/areas';
import { colors, radius, spacing, typography } from '@/theme/theme';
import { SavedLocation } from '@/types';

interface Props {
  value: string | null;
  onChange: (locationId: string | null) => void;
  /** Called with the loaded list, so parents can react to "no locations yet". */
  onLoaded?: (locations: SavedLocation[]) => void;
}

export default function LocationPicker({ value, onChange, onLoaded }: Props) {
  const { user } = useAuth();
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getSavedLocations(user.uid)
      .then((list) => {
        setLocations(list);
        onLoaded?.(list);
        // Pre-select the default place for a new appliance so the common case
        // needs no extra tap.
        if (!value && list.length > 0) {
          onChange((list.find((l) => l.isDefault) ?? list[0]).id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />;
  }

  if (locations.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="location-outline" size={18} color={colors.textMuted} />
        <Text style={styles.emptyText}>
          No saved locations yet. Add one from Profile → My Locations.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {locations.map((loc) => {
        const on = value === loc.id;
        return (
          <TouchableOpacity
            key={loc.id}
            style={[styles.row, on && styles.rowOn]}
            onPress={() => onChange(loc.id)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={on ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={on ? colors.primary : colors.border}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, on && styles.labelOn]}>{loc.label}</Text>
              {loc.area ? <Text style={styles.area}>{areaLabel(loc.area)}</Text> : null}
            </View>
            {loc.isDefault && (
              <View style={styles.defaultPill}>
                <Text style={styles.defaultText}>Default</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  rowOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  label: { ...typography.body, fontWeight: '600' },
  labelOn: { color: colors.primary },
  area: { ...typography.caption, marginTop: 1 },
  defaultPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  defaultText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
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
  emptyText: { ...typography.caption, flex: 1 },
});
