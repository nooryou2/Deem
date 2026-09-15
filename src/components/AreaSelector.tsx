// src/components/AreaSelector.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/theme/theme';
import { areasByGovernorate } from '@/utils/areas';

interface Props {
  selected: string[];
  onChange: (areas: string[]) => void;
  /** Collapse governorates by default — useful in tight spaces. */
  startCollapsed?: boolean;
  /** Show a search box above the list. */
  searchable?: boolean;
}

export default function AreaSelector({
  selected,
  onChange,
  startCollapsed = true,
  searchable = false,
}: Props) {
  const allGroups = areasByGovernorate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    allGroups.reduce((acc, g) => ({ ...acc, [g.governorate]: !startCollapsed }), {})
  );

  // Filter areas by the search text, dropping governorates with no matches.
  const q = query.trim().toLowerCase();
  const groups = q
    ? allGroups
        .map((g) => ({
          ...g,
          areas: g.areas.filter((a) => a.label.toLowerCase().includes(q)),
        }))
        .filter((g) => g.areas.length > 0)
    : allGroups;

  function toggleArea(id: string) {
    onChange(
      selected.includes(id) ? selected.filter((a) => a !== id) : [...selected, id]
    );
  }

  function toggleGovernorate(areaIds: string[], allOn: boolean) {
    onChange(
      allOn
        ? selected.filter((a) => !areaIds.includes(a))
        : Array.from(new Set([...selected, ...areaIds]))
    );
  }

  return (
    <View>
      {searchable && (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search areas…"
            placeholderTextColor={colors.textMuted}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {searchable && selected.length > 0 && (
        <Text style={styles.selectedCount}>
          {selected.length} area{selected.length === 1 ? '' : 's'} selected
        </Text>
      )}

      {groups.length === 0 && (
        <Text style={styles.noResults}>No areas match "{query}".</Text>
      )}

      {groups.map((group) => {
        const ids = group.areas.map((a) => a.id);
        const chosen = ids.filter((id) => selected.includes(id));
        const allOn = chosen.length === ids.length;
        // While searching, always show matches rather than making the user expand.
        const isOpen = q ? true : open[group.governorate];

        return (
          <View key={group.governorate} style={styles.group}>
            <TouchableOpacity
              style={styles.groupHeader}
              activeOpacity={0.7}
              onPress={() =>
                setOpen((o) => ({ ...o, [group.governorate]: !o[group.governorate] }))
              }
            >
              <Ionicons
                name={isOpen ? 'chevron-down' : 'chevron-forward'}
                size={18}
                color={colors.textSecondary}
              />
              <Text style={styles.groupTitle}>{group.governorate}</Text>
              {chosen.length > 0 && (
                <View style={styles.countPill}>
                  <Text style={styles.countText}>{chosen.length}</Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={() => toggleGovernorate(ids, allOn)}
                hitSlop={8}
              >
                <Text style={styles.selectAll}>{allOn ? 'Clear' : 'All'}</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {isOpen && (
              <View style={styles.chipWrap}>
                {group.areas.map((area) => {
                  const on = selected.includes(area.id);
                  return (
                    <TouchableOpacity
                      key={area.id}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => toggleArea(area.id)}
                      activeOpacity={0.8}
                    >
                      {on && (
                        <Ionicons
                          name="checkmark"
                          size={13}
                          color={colors.primary}
                          style={{ marginRight: 4 }}
                        />
                      )}
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {area.label}
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
  );
}

const styles = StyleSheet.create({
  group: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  groupTitle: { ...typography.body, fontWeight: '700' },
  countPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  countText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  selectAll: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextOn: { color: colors.primary },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, outlineStyle: 'none' } as any,
  selectedCount: { ...typography.caption, marginBottom: spacing.sm, fontWeight: '600' },
  noResults: { ...typography.bodySecondary, paddingVertical: spacing.md },
});
