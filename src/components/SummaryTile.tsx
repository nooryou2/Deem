// src/components/SummaryTile.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius, spacing, shadow } from '@/theme/theme';

interface Props {
  label: string;
  value: number;
  color: string;
  backgroundColor: string;
  onPress?: () => void;
}

export default function SummaryTile({ label, value, color, backgroundColor, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'flex-start',
    ...shadow.card,
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
