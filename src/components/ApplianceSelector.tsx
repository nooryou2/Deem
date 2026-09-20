import { useLanguage } from '@/i18n/LanguageContext';
// src/components/ApplianceSelector.tsx
import Text from '@/components/app-text';
import { colors,radius,spacing } from '@/theme/theme';
import { APPLIANCES } from '@/utils/appliances';
import React from 'react';
import { StyleSheet,TextInput,TouchableOpacity,View } from 'react-native';

interface Props {
  selected: string[];
  onToggle: (id: string) => void;
  otherText?: string;
  onOtherTextChange?: (text: string) => void;
}

export default function ApplianceSelector({
  selected,
  onToggle,
  otherText = '',
  onOtherTextChange,
}: Props) {
  const { t } = useLanguage();
  const showOtherField = selected.includes('other') && onOtherTextChange;

  return (
    <View>
      <View style={styles.grid}>
        {APPLIANCES.map((a) => {
          const isOn = selected.includes(a.id);
          return (
            <TouchableOpacity
              key={a.id}
              activeOpacity={0.8}
              onPress={() => onToggle(a.id)}
              style={[styles.chip, isOn && styles.chipOn]}
            >
              <Text style={styles.chipIcon}>{a.icon}</Text>
              <Text style={[styles.chipLabel, isOn && styles.chipLabelOn]}>{t(a.label)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {showOtherField && (
        <TextInput
          style={styles.otherInput}
          value={otherText}
          onChangeText={onOtherTextChange}
          placeholder={t('Describe the other appliance…')}
          placeholderTextColor={colors.textMuted}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipIcon: { fontSize: 15, marginRight: 6 },
  chipLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipLabelOn: { color: colors.primary },
  otherInput: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
});
