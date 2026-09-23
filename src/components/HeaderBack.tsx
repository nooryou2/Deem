// src/components/HeaderBack.tsx
//
// The header's back arrow. The navigator's built-in one always points left,
// and icons aren't mirrored by the browser, so in Arabic it pointed the wrong
// way on every detail page.

import React from 'react';
import { TouchableOpacity } from 'react-native';
import DirectionalArrow from '@/components/DirectionalArrow';
import { colors, spacing } from '@/theme/theme';

export default function HeaderBack({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={10}
      style={{ paddingHorizontal: spacing.md, paddingVertical: 4 }}
    >
      <DirectionalArrow kind="back" size={22} color={colors.textPrimary} />
    </TouchableOpacity>
  );
}
