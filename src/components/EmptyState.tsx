import { useLanguage } from '@/i18n/LanguageContext';
// src/components/EmptyState.tsx
import Text from '@/components/app-text';
import { spacing,typography } from '@/theme/theme';
import React from 'react';
import { StyleSheet,View } from 'react-native';

interface Props {
  icon?: string;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon = '🏠', title, subtitle }: Props) {
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[typography.h3, styles.title]}>{t(title)}</Text>
      {subtitle ? <Text style={styles.subtitle}>{t(subtitle)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
