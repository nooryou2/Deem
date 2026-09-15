// src/components/ChipSelector.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, radius, spacing } from '@/theme/theme';

interface Option {
  value: string;
  label: string;
  icon?: string;
  /** Fill shown when selected. Falls back to the brand colour. */
  color?: string;
  /** Text colour when selected. Needed when `color` is a pale tint, since
   *  white text would be unreadable on it. */
  textColor?: string;
}

interface Props {
  options: Option[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export default function ChipSelector({ options, selectedValue, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.row}>
        {options.map((option) => {
          const isSelected = option.value === selectedValue;
          const accent = option.color ?? colors.primary;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[
                styles.chip,
                // The accent only appears once selected — unselected chips stay
                // neutral so the row doesn't read as five competing colours.
                isSelected && { backgroundColor: accent, borderColor: accent },
              ]}
              activeOpacity={0.8}
            >
              {option.icon ? <Text style={styles.icon}>{option.icon} </Text> : null}
              <Text
                style={[
                  styles.label,
                  isSelected && (option.textColor
                    ? { color: option.textColor, fontWeight: '700' }
                    : styles.labelSelected),
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.white,
  },
});
