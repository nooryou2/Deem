// src/components/RoleSelector.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme/theme';
import { UserRole } from '@/types';

interface Props {
  value: UserRole;
  onChange: (role: UserRole) => void;
}

const OPTIONS: {
  value: UserRole;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  sub: string;
}[] = [
  { value: 'homeowner', label: 'Homeowner', icon: 'home-outline', sub: 'Manage my home' },
  { value: 'provider', label: 'Service Provider', icon: 'construct-outline', sub: 'Offer services' },
];

export default function RoleSelector({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const selected = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.8}
            onPress={() => onChange(opt.value)}
            style={[styles.card, selected && styles.cardSelected]}
          >
            <Ionicons
              name={opt.icon}
              size={24}
              color={selected ? colors.primary : colors.textSecondary}
              style={{ marginBottom: 6 }}
            />
            <Text style={[styles.label, selected && styles.labelSelected]}>{opt.label}</Text>
            <Text style={[styles.sub, selected && styles.subSelected]}>{opt.sub}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  card: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  label: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  labelSelected: { color: colors.primary },
  sub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  subSelected: { color: colors.primary },
});
