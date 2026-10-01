import { useLanguage } from '@/i18n/LanguageContext';
// src/components/EmptyState.tsx
import Text from '@/components/app-text';
import { colors,spacing,typography } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet,View } from 'react-native';

interface Props {
  icon?: string;
  title: string;
  subtitle?: string;
  variant?: 'default' | 'success';
  compact?: boolean;
}

export default function EmptyState({
  icon = '🏠',
  title,
  subtitle,
  variant = 'default',
  compact = false,
}: Props) {
  const { t } = useLanguage();
  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {variant === 'success' ? (
        <View style={styles.successIconWrap}>
          <View style={[styles.ray, styles.rayTop]} />
          <View style={[styles.ray, styles.rayTopRight]} />
          <View style={[styles.ray, styles.rayRight]} />
          <View style={[styles.ray, styles.rayBottomRight]} />
          <View style={[styles.ray, styles.rayBottom]} />
          <View style={[styles.ray, styles.rayBottomLeft]} />
          <View style={[styles.ray, styles.rayLeft]} />
          <View style={[styles.ray, styles.rayTopLeft]} />
          <View style={styles.successCircle}>
            <Ionicons name="checkmark-sharp" size={34} color={colors.primaryDark} />
          </View>
        </View>
      ) : (
        <Text style={styles.icon}>{icon}</Text>
      )}
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
  compactContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  icon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  successIconWrap: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  successCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  rayTop: { top: 0, left: 40 },
  rayTopRight: { top: 10, right: 10, transform: [{ rotate: '45deg' }] },
  rayRight: { right: 0, top: 36, transform: [{ rotate: '90deg' }] },
  rayBottomRight: { bottom: 10, right: 10, transform: [{ rotate: '135deg' }] },
  rayBottom: { bottom: 0, left: 40 },
  rayBottomLeft: { bottom: 10, left: 10, transform: [{ rotate: '45deg' }] },
  rayLeft: { left: 0, top: 36, transform: [{ rotate: '90deg' }] },
  rayTopLeft: { top: 10, left: 10, transform: [{ rotate: '135deg' }] },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
