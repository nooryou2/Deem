import { useLanguage } from '@/i18n/LanguageContext';
import React from 'react';
import { Platform,Text,TextProps } from 'react-native';
export default function AppText({ style, ...props }: TextProps) {
  const { rtl } = useLanguage();
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: Platform.OS === 'web' ? 'Tahoma, Arial, sans-serif' : undefined,
          writingDirection: rtl ? 'rtl' : 'ltr',
          textAlign: rtl ? 'right' : 'left',
        },
        style,
      ]}
    />
  );
}
