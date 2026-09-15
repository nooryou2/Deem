// src/components/StepIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/theme/theme';

interface Props {
  steps: string[];
  /** Zero-based index of the step currently being worked on. */
  current: number;
}

export default function StepIndicator({ steps, current }: Props) {
  return (
    <View style={styles.wrap}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const isLast = i === steps.length - 1;

        return (
          <React.Fragment key={label}>
            <View style={styles.stepCol}>
              <View
                style={[
                  styles.circle,
                  (done || active) && styles.circleOn,
                  done && styles.circleDone,
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={15} color={colors.white} />
                ) : (
                  <Text style={[styles.num, active && styles.numOn]}>{i + 1}</Text>
                )}
              </View>
              <Text
                style={[styles.label, active && styles.labelOn, done && styles.labelDone]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>

            {!isLast && <View style={[styles.line, done && styles.lineDone]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  stepCol: { alignItems: 'center', width: 92 },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  circleDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  num: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  numOn: { color: colors.white },
  label: { ...typography.caption, marginTop: 6, textAlign: 'center' },
  labelOn: { color: colors.primary, fontWeight: '700' },
  labelDone: { color: colors.textSecondary },
  line: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.border,
    marginTop: 15,
  },
  lineDone: { backgroundColor: colors.primary },
});
