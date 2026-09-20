// src/components/SearchBar.tsx
//
// The app's single search field. Pill-shaped, with a magnifier on the left and
// a clear button that only appears once there's something to clear.

import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme/theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder = 'Search' }: Props) {
  return (
    <View style={styles.wrapper}>
      <Ionicons name="search" size={20} color={colors.primary} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        // The custom clear button below covers both platforms, so the iOS
        // built-in one would be a duplicate.
        clearButtonMode="never"
      />
      {value.length > 0 ? (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={10} style={styles.clearBtn}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    height: 48,
    // A soft lift rather than a hard border, so the field reads as raised.
    shadowColor: '#3D2E1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  icon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    height: '100%',
    outlineStyle: 'none',
  } as any,
  clearBtn: { marginLeft: spacing.sm },
});
