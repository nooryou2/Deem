import Text from '@/components/app-text';
import { useLanguage } from '@/i18n/LanguageContext';
import { colors } from '@/theme/theme';
import React from 'react';
import { Pressable } from 'react-native';
export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      onPress={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
      style={{ padding: 12, alignSelf: 'flex-end' }}
    >
      <Text style={{ color: colors.primaryDark, fontSize: 14, fontWeight: '600' }}>
        {language === 'ar' ? 'English' : 'العربية'}
      </Text>
    </Pressable>
  );
}
