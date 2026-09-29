import { useLanguage } from '@/i18n/LanguageContext';
// src/components/ServiceProgressTracker.tsx
import Text from '@/components/app-text';
import { colors,spacing } from '@/theme/theme';
import { ServiceRequestStatus } from '@/types';
import React from 'react';
import { StyleSheet,View } from 'react-native';

interface Props {
  status: ServiceRequestStatus;
  providerName: string;
}

// The happy-path steps a request moves through.
const STEPS: { key: ServiceRequestStatus; label: string }[] = [
  { key: 'pending', label: 'Requested' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

const ORDER: Record<ServiceRequestStatus, number> = {
  pending: 0,
  accepted: 1,
  in_progress: 2,
  completed: 3,
  declined: -1,
};

export default function ServiceProgressTracker({ status, providerName }: Props) {
  const { t } = useLanguage();
  // Declined is a dead-end state — show a distinct message instead of the track.
  if (status === 'declined') {
    return (
      <View style={styles.declinedBox}>
        <Text style={styles.declinedTitle}>{t('Request declined')}</Text>
        <Text style={styles.declinedSub}>
          {providerName}
          {t("can't take this on right now. You can request another provider.")}
        </Text>
      </View>
    );
  }

  const currentIndex = ORDER[status];

  return (
    <View style={styles.wrap}>
      <Text style={styles.assignedTo}>
        {t('Provider')} {providerName}
      </Text>
      <View style={styles.track}>
        {STEPS.map((step, i) => {
          const done = i <= currentIndex;
          const isLast = i === STEPS.length - 1;
          return (
            <React.Fragment key={step.key}>
              <View style={styles.stepCol}>
                <View style={[styles.dot, done ? styles.dotDone : styles.dotTodo]}>
                  {done ? <Text style={styles.check}>✓</Text> : null}
                </View>
                <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>
                  {t(step.label)}
                </Text>
              </View>
              {!isLast && (
                <View style={[styles.line, i < currentIndex ? styles.lineDone : styles.lineTodo]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const DONE = colors.primary;
const TODO = colors.border;

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assignedTo: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  track: { flexDirection: 'row', alignItems: 'flex-start', width: '100%' },
  stepCol: { alignItems: 'center', flex: 1, minWidth: 0 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  dotDone: { backgroundColor: DONE, borderColor: DONE },
  dotTodo: { backgroundColor: colors.surface, borderColor: TODO },
  check: { color: colors.white, fontSize: 13, fontWeight: '800' },
  stepLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
    flexShrink: 1,
  },
  stepLabelDone: { color: colors.textPrimary, fontWeight: '600' },
  line: { height: 2, flex: 0.55, marginTop: 13, borderRadius: 1, minWidth: 8 },
  lineDone: { backgroundColor: DONE },
  lineTodo: { backgroundColor: TODO },
  declinedBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  declinedTitle: { fontSize: 14, fontWeight: '700', color: '#B91C1C' },
  declinedSub: { fontSize: 13, color: '#7F1D1D', marginTop: 4 },
});
