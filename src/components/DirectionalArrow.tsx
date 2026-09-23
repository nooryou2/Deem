// src/components/DirectionalArrow.tsx
//
// An arrow that points the right way in both languages. A typed "←" character
// can't do this: "forward" points right in English but left in Arabic, so a
// single character baked into a translation string is always wrong in one of
// them. This picks the glyph from meaning plus the current reading direction.

import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  /** "forward" = go on / next / open; "back" = return to a previous place. */
  kind: 'forward' | 'back';
  /** "arrow" for actions, "chevron" for rows you tap to open. */
  shape?: 'arrow' | 'chevron';
  size?: number;
  color: string;
  style?: StyleProp<TextStyle>;
}

export default function DirectionalArrow({
  kind,
  shape = 'arrow',
  size = 16,
  color,
  style,
}: Props) {
  const { rtl } = useLanguage();
  // Ionicons' "-forward" glyphs point right. In a right-to-left language
  // "forward" travels left, so the glyphs swap. Icons are not mirrored by the
  // browser or by React Native Web, so this is the only place it happens.
  const pointsRight = kind === 'forward' ? !rtl : rtl;
  const name = `${shape}-${pointsRight ? 'forward' : 'back'}` as
    | 'arrow-forward'
    | 'arrow-back'
    | 'chevron-forward'
    | 'chevron-back';
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
