// src/components/AppDialog.tsx
//
// The app's own confirmation and message dialogs, replacing the browser's
// window.alert / window.confirm and the native Alert. Those look different on
// every platform and can't be styled; this matches the rest of DEEM.
//
// Used through the `useDialog()` hook:
//   await dialog.alert({ title: 'Location Saved!', message: '…' });
//   if (await dialog.confirm({ title: 'Delete this item?', destructive: true })) { … }

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '@/components/app-text';
import Button from '@/components/Button';
import { useLanguage } from '@/i18n/LanguageContext';
import { colors, radius, spacing, shadow, typography } from '@/theme/theme';

type DialogTone = 'success' | 'error' | 'warning' | 'question';

interface DialogOptions {
  title?: string;
  message?: string;
  tone?: DialogTone;
  /** Label of the main button. Defaults to Done / Confirm. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Shows the main action in red, for deletions and removals. */
  destructive?: boolean;
}

interface Pending extends DialogOptions {
  mode: 'alert' | 'confirm';
  resolve: (value: boolean) => void;
}

interface DialogApi {
  alert: (options: DialogOptions | string) => Promise<void>;
  confirm: (options: DialogOptions | string) => Promise<boolean>;
}

const DialogContext = createContext<DialogApi>({
  alert: async () => {},
  confirm: async () => false,
});

export function useDialog(): DialogApi {
  return useContext(DialogContext);
}

const TONES: Record<DialogTone, { icon: keyof typeof Ionicons.glyphMap; color: string; tint: string }> = {
  success: { icon: 'checkmark', color: colors.primary, tint: colors.primaryLight },
  error: { icon: 'close', color: '#D92D20', tint: '#FEE4E2' },
  warning: { icon: 'alert', color: '#B54708', tint: '#FEF0C7' },
  question: { icon: 'help', color: colors.primary, tint: colors.primaryLight },
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [pending, setPending] = useState<Pending | null>(null);

  const open = useCallback(
    (mode: 'alert' | 'confirm', options: DialogOptions | string) =>
      new Promise<boolean>((resolve) => {
        const opts = typeof options === 'string' ? { message: options } : options;
        setPending({ mode, ...opts, resolve });
      }),
    []
  );

  const api = useMemo<DialogApi>(
    () => ({
      alert: async (options) => {
        await open('alert', options);
      },
      confirm: (options) => open('confirm', options),
    }),
    [open]
  );

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  // A confirm with nothing else specified is a question; an alert is a
  // success note unless the caller says otherwise.
  const tone: DialogTone =
    pending?.tone ??
    (pending?.destructive ? 'warning' : pending?.mode === 'confirm' ? 'question' : 'success');
  const toneStyle = TONES[tone];

  return (
    <DialogContext.Provider value={api}>
      {children}

      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => close(false)}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: toneStyle.tint }]}>
              <Ionicons name={toneStyle.icon} size={34} color={toneStyle.color} />
            </View>

            {pending?.title ? <Text style={styles.title}>{t(pending.title)}</Text> : null}
            {pending?.message ? <Text style={styles.message}>{t(pending.message)}</Text> : null}

            {pending?.mode === 'confirm' ? (
              <View style={styles.actions}>
                <Button
                  label={t(pending?.cancelLabel ?? 'Cancel')}
                  variant="secondary"
                  onPress={() => close(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  label={t(pending?.confirmLabel ?? 'Confirm')}
                  variant={pending?.destructive ? 'danger' : 'primary'}
                  onPress={() => close(true)}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <Button
                label={t(pending?.confirmLabel ?? 'Done')}
                onPress={() => close(true)}
                style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
              />
            )}
          </View>
        </View>
      </Modal>
    </DialogContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.h2, textAlign: 'center' },
  message: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, alignSelf: 'stretch' },
});
