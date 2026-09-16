import { useLanguage } from '@/i18n/LanguageContext';
// src/components/GoogleButton.tsx
import Text from '@/components/app-text';
import { colors,radius,spacing } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator,StyleSheet,TouchableOpacity,View } from 'react-native';

interface Props {
  label?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function GoogleButton({
  label = 'Continue with Google',
  onPress,
  loading = false,
  disabled = false,
}: Props) {
  const { t } = useLanguage();
  return (
    <View>
      <TouchableOpacity
        style={[styles.button, (disabled || loading) && styles.disabled]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={colors.textSecondary} />
        ) : (
          <View style={styles.content}>
            <Ionicons name="logo-google" size={18} color="#4285F4" />
            <Text style={styles.label}>{t(label)}</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 20, marginTop: 10 }}>
        {t(
          'Google shares your name, email and profile picture. We do not request access to Gmail or Drive.',
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.6 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
});
