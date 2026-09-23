import Text from '@/components/app-text';
import { useLanguage } from '@/i18n/LanguageContext';
import { colors } from '@/theme/theme';
import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
/**
 * `style` lets a caller override placement. On its own in a column it sits at
 * the end; inside a row it should centre vertically instead.
 */
export default function LanguageSwitcher({ style }: { style?: StyleProp<ViewStyle> }) {
  const { language, setLanguage } = useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      onPress={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
      style={[{ padding: 12, alignSelf: 'flex-end' }, style]}
    >
      <Text style={{ color: colors.primaryDark, fontSize: 14, fontWeight: '600' }}>
        {language === 'ar' ? 'English' : 'العربية'}
      </Text>
    </Pressable>
  );
}
