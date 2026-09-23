import { useLanguage } from '@/i18n/LanguageContext';
import { fmtNumber } from '@/i18n/locale';
// src/components/SummaryTile.tsx
import Text from '@/components/app-text';
import { radius,shadow,spacing } from '@/theme/theme';
import React from 'react';
import { StyleSheet,TouchableOpacity } from 'react-native';

interface Props {
  label: string;
  value: number;
  color: string;
  backgroundColor: string;
  onPress?: () => void;
}

export default function SummaryTile({ label, value, color, backgroundColor, onPress }: Props) {
  const { t } = useLanguage();
  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <Text style={[styles.value, { color }]}>{fmtNumber(value)}</Text>
      <Text style={[styles.label, { color }]}>{t(label)}</Text>
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
