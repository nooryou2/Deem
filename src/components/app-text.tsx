import { useLanguage } from '@/i18n/LanguageContext';
import React from 'react';
import { Platform,Text,TextProps } from 'react-native';
interface AppTextProps extends TextProps {
  /**
   * For values that are always Latin — emails, links, phone numbers. They read
   * left-to-right in both languages, but still sit at the start of the line so
   * they line up with the text above and below them.
   */
  ltr?: boolean;
}

export default function AppText({ style, ltr = false, ...props }: AppTextProps) {
  const { rtl } = useLanguage();
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: Platform.OS === 'web' ? 'Tahoma, Arial, sans-serif' : undefined,
          writingDirection: ltr ? 'ltr' : rtl ? 'rtl' : 'ltr',
          textAlign: rtl ? 'right' : 'left',
        },
        style,
      ]}
    />
  );
}
