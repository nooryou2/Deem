// src/components/StarRating.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/theme';

interface Props {
  value: number;
  onChange?: (stars: number) => void;
  size?: number;
  /** Read-only display (no tapping). */
  readonly?: boolean;
}

export default function StarRating({ value, onChange, size = 32, readonly = false }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        // Half-fill support for averages like 4.5 in read-only mode.
        const filled = value >= star;
        const half = !filled && readonly && value > star - 1;
        return (
          <TouchableOpacity
            key={star}
            disabled={readonly}
            onPress={() => onChange?.(star)}
            activeOpacity={0.7}
            hitSlop={4}
          >
            <Ionicons
              name={filled ? 'star' : half ? 'star-half' : 'star-outline'}
              size={size}
              color={filled || half ? '#E8A33D' : colors.border}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
});
